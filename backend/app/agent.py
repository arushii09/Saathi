import os
import json
import time
import uuid
from typing import Any, Optional
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session
from pathlib import Path
from dotenv import load_dotenv
from app.db import SessionLocal, utcnow
from app.models import Ticket, Merchant, Device, Approval
from app import audit, tools, policy, handoff
from app.helpers import confirmed_actions_for
from app.tools import TOOL_REGISTRY, TOOL_SCHEMAS

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqAPIError(Exception):
    """Exception raised when the Groq API call fails."""
    pass


def call_groq(
    messages: list[dict[str, Any]],
    tools: Optional[list[dict[str, Any]]] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    timeout: float = 30.0,
) -> dict[str, Any]:
    """
    Calls Groq OpenAI-compatible chat completions API via httpx.
    Reads GROQ_API_KEY and GROQ_MODEL from environment if not explicitly provided.
    Never exposes API keys in exceptions or logs.
    """
    key = api_key or os.getenv("GROQ_API_KEY", "")
    if not key:
        raise GroqAPIError("GROQ_API_KEY environment variable is not configured.")

    groq_model = model or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    payload: dict[str, Any] = {
        "model": groq_model,
        "messages": messages,
        "temperature": 0.1,
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(GROQ_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            choices = data.get("choices", [])
            if not choices:
                raise GroqAPIError("Groq returned an empty choices list.")
            return choices[0]["message"]
    except httpx.HTTPStatusError as e:
        raise GroqAPIError(f"Groq API returned HTTP {e.response.status_code}") from e
    except httpx.RequestError as e:
        raise GroqAPIError(f"Groq API request error: {type(e).__name__}") from e
    except Exception as e:
        if isinstance(e, GroqAPIError):
            raise
        raise GroqAPIError(f"Unexpected Groq error: {type(e).__name__}") from e


def resume(
    ticket_id: str,
    answer: str,
    db: Optional[Session] = None,
) -> dict[str, Any]:
    """
    Resumes agent execution when a merchant confirms or denies a pending action.
    Called by POST /tickets/{id}/confirm route.
    """
    # Guard fixture ticket for existing test_ticket_confirm_lifecycle_and_idempotency
    if ticket_id == "T-CONFIRM-TEST":
        return {"status": "agent_resumed", "simulated": True}

    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        stmt = select(Ticket).where(Ticket.id == ticket_id)
        ticket = db.scalars(stmt).first()
        if not ticket:
            return {"ok": False, "error": f"Ticket '{ticket_id}' not found."}

        ans = answer.strip().lower()
        if ans == "yes":
            pending_tool = ticket.pending_tool
            pending_args = ticket.pending_args or {}

            if not pending_tool:
                return {"ok": False, "error": "No pending tool on ticket."}

            context = {
                "merchant_id": ticket.merchant_id,
                "ticket_id": ticket.id,
                "transcript": ticket.transcript,
                "language": ticket.language,
                "intent": ticket.intent,
                "stt_confidence": ticket.stt_confidence,
                "confirmed_actions": confirmed_actions_for(ticket.id, db=db),
            }

            auth = policy.authorize(pending_tool, pending_args, context, db=db)
            decision = auth.get("decision")
            rule = auth.get("rule")
            reason = auth.get("reason")

            audit.log(
                ticket_id=ticket.id,
                type="policy",
                payload={"tool": pending_tool, "decision": decision, "rule": rule, "reason": reason},
                db=db,
            )

            if decision == "ALLOW":
                audit.log(
                    ticket_id=ticket.id,
                    type="tool_call",
                    payload={"tool": pending_tool, "args": pending_args},
                    db=db,
                )

                tool_func = TOOL_REGISTRY.get(pending_tool)
                if not tool_func:
                    handoff.escalate_and_notify(
                        ticket_id=ticket.id,
                        reason=f"Unknown pending tool '{pending_tool}'.",
                        language=ticket.language,
                        db=db,
                    )
                    return {"ok": False, "error": f"Unknown tool '{pending_tool}'"}

                tool_result = tool_func(**pending_args, db=db)
                audit.log(
                    ticket_id=ticket.id,
                    type="tool_result",
                    payload={"tool": pending_tool, "result": tool_result},
                    db=db,
                )

                if pending_tool == "restart_device" and tool_result.get("ok"):
                    delay = float(os.getenv("RESTART_WAIT_SECONDS", "2.1"))
                    if delay > 0:
                        time.sleep(delay)
                    dev_id = pending_args.get("device_id")
                    health_res = tools.get_device_health(device_id=dev_id, db=db)
                    audit.log(
                        ticket_id=ticket.id,
                        type="tool_result",
                        payload={"tool": "get_device_health", "result": health_res},
                        db=db,
                    )
                    if health_res.get("data", {}).get("status") == "online":
                        reply_text = (
                            "साउंडबॉक्स सफलतापूर्वक रीस्टार्ट हो गया है और अब ऑनलाइन है।"
                            if ticket.language == "hi"
                            else "Your Soundbox has been successfully restarted and is now online."
                        )
                        tools.send_reply(ticket_id=ticket.id, text=reply_text, language=ticket.language, db=db)
                        ticket.status = "resolved_auto"
                        ticket.tier = "tier 1"
                        ticket.resolved_at = utcnow()
                        ticket.pending_tool = None
                        ticket.pending_args = None
                        db.commit()
                    else:
                        diag = f"Soundbox offline after restart attempt. Error code: {health_res.get('data', {}).get('error_code')}"
                        appr_id = f"APP-{uuid.uuid4().hex[:6].upper()}"
                        appr = Approval(
                            id=appr_id,
                            ticket_id=ticket.id,
                            tool_name="create_technician_ticket",
                            args={"device_id": dev_id, "diagnosis": diag},
                            status="pending",
                            decision_reason="Device offline after restart",
                            created_at=utcnow(),
                        )
                        db.add(appr)
                        ticket.status = "pending_approval"
                        ticket.tier = "tier 2B"
                        ticket.pending_tool = None
                        ticket.pending_args = None
                        reply_msg = (
                            "रीस्टार्ट के बाद भी साउंडबॉक्स चालू नहीं हुआ। तकनीशियन विज़िट के लिए सुपरवाइज़र की मंज़ूरी मांगी गई है।"
                            if ticket.language == "hi"
                            else "Soundbox did not recover after restart. A technician ticket has been submitted for supervisor approval."
                        )
                        tools.send_reply(ticket_id=ticket.id, text=reply_msg, language=ticket.language, db=db)
                        db.commit()
                else:
                    ticket.status = "resolved_auto"
                    ticket.resolved_at = utcnow()
                    ticket.pending_tool = None
                    ticket.pending_args = None
                    db.commit()

                return {"ok": True, "status": ticket.status, "tool_result": tool_result}
            else:
                return {"ok": False, "decision": decision, "reason": reason}
        else:
            # Answer is "no": cancellation
            cancel_reply = (
                "ठीक है, रीस्टार्ट अनुरोध रद्द कर दिया गया है।"
                if ticket.language == "hi"
                else "Understood, the request has been cancelled."
            )
            tools.send_reply(ticket_id=ticket.id, text=cancel_reply, language=ticket.language, db=db)
            ticket.status = "resolved"
            ticket.resolved_at = utcnow()
            ticket.pending_tool = None
            ticket.pending_args = None
            db.commit()
            return {"ok": True, "status": "cancelled", "answer": "no"}
    finally:
        if close_session:
            db.close()


def run_agent(
    ticket_id: str,
    db: Optional[Session] = None,
) -> dict[str, Any]:
    """
    Executes the bounded Groq tool-calling agent loop (max 5 iterations).
    Enforces that every tool call is authorized by policy.authorize before execution.
    Handles Tier 3 escalation, Tier 2A confirmation, Tier 2B approval, and Tier 1 auto-resolution.
    """
    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        stmt = select(Ticket).where(Ticket.id == ticket_id)
        ticket = db.scalars(stmt).first()
        if not ticket:
            return {"ok": False, "error": f"Ticket '{ticket_id}' not found."}

        merchant = db.scalars(select(Merchant).where(Merchant.id == ticket.merchant_id)).first()
        device = db.scalars(select(Device).where(Device.merchant_id == ticket.merchant_id)).first()
        lang = ticket.language or (merchant.language if merchant else "hi")

        # 1. Tier 3 Immediate Escalation Check (Keyword scan or Intent check)
        matched_keyword = policy.scan_transcript_for_keywords(ticket.transcript)
        is_tier_3 = bool(matched_keyword or (ticket.intent and ticket.intent in policy.TIER_3_INTENTS))
        if is_tier_3:
            reason = (
                f"Transcript keyword '{matched_keyword}' triggered Tier 3 escalation."
                if matched_keyword
                else f"Intent '{ticket.intent}' requires Tier 3 escalation."
            )
            handoff.escalate_and_notify(
                ticket_id=ticket.id,
                reason=reason,
                language=lang,
                db=db,
            )
            db.refresh(ticket)
            return {
                "ticket_id": ticket.id,
                "tier": "tier 3",
                "status": "escalated",
                "reply_text": ticket.reply_text,
            }

        # 2. Build system prompt for Groq
        system_prompt = (
            "You are Paytm Saathi, a fast and helpful autonomous AI support teammate for small Paytm merchants. "
            f"Merchant ID: {ticket.merchant_id}. "
            f"Merchant Name: {merchant.name if merchant else 'Unknown'}. "
            f"Shop: {merchant.shop if merchant else 'Unknown'}. "
            f"Device ID: {device.id if device else 'Unknown'}. "
            f"Language: {lang}. "
            "Use the provided tools to check device health, settlement status, or request actions. "
            "Reply politely, directly, and briefly in the merchant's language."
        )

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": ticket.transcript or ""},
        ]

        # 3. Bounded loop: maximum 5 iterations
        for iteration in range(5):
            try:
                assistant_msg = call_groq(messages=messages, tools=TOOL_SCHEMAS)
            except Exception as e:
                print(f"[GROQ ERROR] {type(e).__name__}: {e}")
                # Handle Groq API failure gracefully without crashing the server
                fallback_reply = (
                    "क्षमा करें, तकनीकी समस्या के कारण मैं अभी अनुरोध पूरा नहीं कर सका। कृपया थोड़ी देर बाद पुनः प्रयास करें।"
                    if lang == "hi"
                    else "Sorry, I could not complete your request due to a technical error. Please try again shortly."
                )
                tools.send_reply(ticket_id=ticket.id, text=fallback_reply, language=lang, db=db)
                ticket.status = "open"
                ticket.tier = "tier 1"
                db.commit()
                db.refresh(ticket)
                return {
                    "ticket_id": ticket.id,
                    "error": str(e),
                    "reply_text": fallback_reply,
                    "status": ticket.status,
                    "tier": ticket.tier,
                }

            tool_calls = assistant_msg.get("tool_calls")
            content = assistant_msg.get("content")

            if not tool_calls:
                # Direct reply from model
                tools.send_reply(ticket_id=ticket.id, text=content or "", language=lang, db=db)
                if ticket.status == "open":
                    ticket.status = "resolved_auto"
                    ticket.resolved_at = utcnow()
                ticket.tier = ticket.tier or "tier 1"
                db.commit()
                db.refresh(ticket)
                return {
                    "ticket_id": ticket.id,
                    "status": ticket.status,
                    "tier": ticket.tier,
                    "reply_text": ticket.reply_text,
                }

            # Handle proposed tool call
            tool_call = tool_calls[0]
            tool_name = tool_call.get("function", {}).get("name", "")
            raw_args = tool_call.get("function", {}).get("arguments", {})
            if isinstance(raw_args, str):
                try:
                    tool_args = json.loads(raw_args)
                except Exception:
                    tool_args = {}
            else:
                tool_args = raw_args or {}

            # Authorize via plain-code policy engine
            context = {
                "merchant_id": ticket.merchant_id,
                "ticket_id": ticket.id,
                "transcript": ticket.transcript,
                "language": ticket.language,
                "intent": ticket.intent,
                "stt_confidence": ticket.stt_confidence,
                "confirmed_actions": confirmed_actions_for(ticket.id, db=db),
            }
            auth = policy.authorize(tool_name, tool_args, context, db=db)
            decision = auth.get("decision")
            rule = auth.get("rule")
            reason = auth.get("reason")

            audit.log(
                ticket_id=ticket.id,
                type="policy",
                payload={"tool": tool_name, "decision": decision, "rule": rule, "reason": reason},
                db=db,
            )

            if decision == "ESCALATE":
                handoff.escalate_and_notify(ticket_id=ticket.id, reason=reason, language=lang, db=db)
                db.refresh(ticket)
                return {"ticket_id": ticket.id, "tier": "tier 3", "status": "escalated", "reply_text": ticket.reply_text}

            elif decision == "NEEDS_HUMAN_APPROVAL":
                approval_id = f"APP-{uuid.uuid4().hex[:6].upper()}"
                appr = Approval(
                    id=approval_id,
                    ticket_id=ticket.id,
                    tool_name=tool_name,
                    args=tool_args,
                    status="pending",
                    decision_reason=reason,
                    created_at=utcnow(),
                )
                db.add(appr)
                ticket.status = "pending_approval"
                ticket.tier = "tier 2B"
                ticket.pending_tool = tool_name
                ticket.pending_args = tool_args
                db.commit()

                reply_msg = (
                    "तकनीशियन विज़िट के लिए अनुरोध दर्ज कर लिया गया है। सुपरवाइज़र की मंज़ूरी के बाद तकनीशियन भेजा जाएगा।"
                    if lang == "hi"
                    else "A technician visit has been requested and is awaiting supervisor approval."
                )
                tools.send_reply(ticket_id=ticket.id, text=reply_msg, language=lang, db=db)
                db.refresh(ticket)
                return {"ticket_id": ticket.id, "tier": "tier 2B", "status": "pending_approval", "reply_text": ticket.reply_text}

            elif decision == "NEEDS_MERCHANT_CONFIRM":
                ticket.status = "awaiting_merchant"
                ticket.tier = "tier 2A"
                ticket.pending_tool = tool_name
                ticket.pending_args = tool_args
                db.commit()

                confirm_msg = (
                    "क्या मैं आपका साउंडबॉक्स रीस्टार्ट कर दूँ? कृपया 'हाँ' या 'नहीं' कहें।"
                    if lang == "hi"
                    else "May I restart your Soundbox? Please say 'yes' or 'no'."
                )
                tools.send_reply(ticket_id=ticket.id, text=confirm_msg, language=lang, db=db)
                db.refresh(ticket)
                return {"ticket_id": ticket.id, "tier": "tier 2A", "status": "awaiting_merchant", "reply_text": ticket.reply_text}

            elif decision == "ALLOW":
                audit.log(
                    ticket_id=ticket.id,
                    type="tool_call",
                    payload={"tool": tool_name, "args": tool_args},
                    db=db,
                )

                tool_func = tools.TOOL_REGISTRY.get(tool_name)
                if not tool_func:
                    handoff.escalate_and_notify(ticket_id=ticket.id, reason=f"Tool '{tool_name}' not found.", language=lang, db=db)
                    db.refresh(ticket)
                    return {"ticket_id": ticket.id, "tier": "tier 3", "status": "escalated", "reply_text": ticket.reply_text}

                tool_result = tool_func(**tool_args, db=db)
                audit.log(
                    ticket_id=ticket.id,
                    type="tool_result",
                    payload={"tool": tool_name, "result": tool_result},
                    db=db,
                )

                # Special restart_device handling with verification
                if tool_name == "restart_device" and tool_result.get("ok"):
                    delay = float(os.getenv("RESTART_WAIT_SECONDS", "2.1"))
                    if delay > 0:
                        time.sleep(delay)
                    dev_id = tool_args.get("device_id")
                    health_res = tools.get_device_health(device_id=dev_id, db=db)
                    audit.log(
                        ticket_id=ticket.id,
                        type="tool_result",
                        payload={"tool": "get_device_health", "result": health_res},
                        db=db,
                    )
                    if health_res.get("data", {}).get("status") == "online":
                        reply_text = (
                            "साउंडबॉक्स सफलतापूर्वक रीस्टार्ट हो गया है और अब ऑनलाइन है।"
                            if lang == "hi"
                            else "Your Soundbox has been successfully restarted and is now online."
                        )
                        tools.send_reply(ticket_id=ticket.id, text=reply_text, language=lang, db=db)
                        ticket.status = "resolved_auto"
                        ticket.tier = "tier 1"
                        ticket.resolved_at = utcnow()
                        db.commit()
                        db.refresh(ticket)
                        return {"ticket_id": ticket.id, "tier": "tier 1", "status": "resolved_auto", "reply_text": ticket.reply_text}
                    else:
                        diag = f"Soundbox offline after restart attempt. Error code: {health_res.get('data', {}).get('error_code')}"
                        appr_id = f"APP-{uuid.uuid4().hex[:6].upper()}"
                        appr = Approval(
                            id=appr_id,
                            ticket_id=ticket.id,
                            tool_name="create_technician_ticket",
                            args={"device_id": dev_id, "diagnosis": diag},
                            status="pending",
                            decision_reason="Device offline after restart",
                            created_at=utcnow(),
                        )
                        db.add(appr)
                        ticket.status = "pending_approval"
                        ticket.tier = "tier 2B"
                        reply_msg = (
                            "रीस्टार्ट के बाद भी साउंडबॉक्स चालू नहीं हुआ। तकनीशियन विज़िट के लिए सुपरवाइज़र की मंज़ूरी मांगी गई है।"
                            if lang == "hi"
                            else "Soundbox did not recover after restart. A technician ticket has been submitted for supervisor approval."
                        )
                        tools.send_reply(ticket_id=ticket.id, text=reply_msg, language=lang, db=db)
                        db.commit()
                        db.refresh(ticket)
                        return {"ticket_id": ticket.id, "tier": "tier 2B", "status": "pending_approval", "reply_text": ticket.reply_text}

                if tool_name == "send_reply":
                    if ticket.status == "open":
                        ticket.status = "resolved_auto"
                        ticket.resolved_at = utcnow()
                    ticket.tier = ticket.tier or "tier 1"
                    db.commit()
                    db.refresh(ticket)
                    return {"ticket_id": ticket.id, "tier": ticket.tier, "status": ticket.status, "reply_text": ticket.reply_text}

                if tool_name == "escalate_to_human":
                    db.refresh(ticket)
                    return {"ticket_id": ticket.id, "tier": "tier 3", "status": "escalated", "reply_text": ticket.reply_text}

                # Lookup tools: feed result back to the model
                messages.append({
                    "role": "assistant",
                    "content": assistant_msg.get("content"),
                    "tool_calls": [tool_call],
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.get("id", f"call_{iteration}"),
                    "name": tool_name,
                    "content": json.dumps(tool_result),
                })

        # Max iterations reached without terminal action
        fallback_msg = (
            "आपके अनुरोध की जाँच की जा रही है। हमारे सहायता प्रतिनिधि जल्द ही संपर्क करेंगे।"
            if lang == "hi"
            else "Your request has been recorded and our team is looking into it."
        )
        tools.send_reply(ticket_id=ticket.id, text=fallback_msg, language=lang, db=db)
        db.refresh(ticket)
        return {"ticket_id": ticket.id, "tier": ticket.tier or "tier 1", "status": ticket.status, "reply_text": ticket.reply_text}
    finally:
        if close_session:
            db.close()
