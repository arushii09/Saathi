import os
import re
import unicodedata
from typing import Any, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Device

# ---------------------------------------------------------------------------
# Thresholds and Intent Sets
# ---------------------------------------------------------------------------
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.75"))

TIER_3_INTENTS = {
    "unauthorised_transaction",
    "unauthorized_transaction",
    "fraud",
    "kyc",
    "bank_details",
    "refund",
    "money_dispute",
    "identity_dispute",
    "settlement_retry",
}

# Required arguments per tool
TOOL_REQUIRED_ARGS = {
    "get_merchant": ["merchant_id"],
    "get_device_health": ["device_id"],
    "get_settlement_status": ["merchant_id"],
    "restart_device": ["device_id"],
    "create_technician_ticket": ["device_id", "diagnosis"],
    "escalate_to_human": ["ticket_id", "summary"],
    "send_reply": ["ticket_id", "text", "language"],
}


# ---------------------------------------------------------------------------
# Keyword Normalization and Lists
# ---------------------------------------------------------------------------
def normalize_text(text: str) -> str:
    """
    NFKC normalize, lowercase, strip punctuation (by replacing punctuation categories with space),
    and collapse multiple spaces.
    """
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKC", text).lower()
    cleaned = "".join(
        " " if unicodedata.category(c).startswith("P") else c for c in normalized
    )
    return re.sub(r"\s+", " ", cleaned).strip()


RAW_SHORT_TERMS = [
    "kyc",
    "otp",
    "pin",
    "ओटीपी",
    "केवाईसी",
    "के वाईसी",
]

RAW_LONG_PHRASES = [
    # English
    "unauthorised",
    "unauthorized",
    "fraud",
    "scam",
    "hacked",
    "stolen",
    "refund",
    "chargeback",
    "reversal",
    "reverse the payment",
    "bank account",
    "account number",
    "pin number",
    "password",
    "without my permission",
    "ignore the rules",
    "ignore previous instructions",
    "you are now",
    # Hinglish
    "dhokha",
    "dhoka",
    "chori",
    "paisa kat gaya",
    "paise kat gaye",
    "bina puchhe",
    "bina pooche",
    "bina permission",
    "refund karo",
    "wapas karo",
    "bank khata",
    "khata number",
    # Devanagari
    "धोखा",
    "धोखाधड़ी",
    "चोरी",
    "फ्रॉड",
    "रिफंड",
    "पैसा कट गया",
    "पैसे कट गए",
    "बिना पूछे",
    "बिना अनुमति",
    "बैंक खाता",
    "खाता नंबर",
    "वापस करो",
]

# Normalized at import time using the exact same normalization function
SHORT_TERMS: set[str] = {normalize_text(t) for t in RAW_SHORT_TERMS}
LONG_PHRASES: list[str] = [
    normalize_text(p) for p in RAW_LONG_PHRASES if normalize_text(p) not in SHORT_TERMS
]


def scan_transcript_for_keywords(raw_transcript: Optional[str]) -> Optional[str]:
    """
    Scans a raw transcript for Tier 3 keywords.
    - Short terms are matched with leading and trailing spaces (" term ").
    - Longer phrases are matched as substrings ("refunded", "frauds").
    Returns matched term or None.
    """
    if not raw_transcript:
        return None

    norm_text = normalize_text(raw_transcript)
    padded_text = f" {norm_text} "

    # 1. Short terms exact token match
    for st in SHORT_TERMS:
        if f" {st} " in padded_text:
            return st

    # 2. Longer phrases substring match
    for lp in LONG_PHRASES:
        if lp in norm_text:
            return lp

    return None


def _get_ctx(context: Any, key: str, default: Any = None) -> Any:
    """Helper to access attributes from dict, dataclass, or Pydantic model."""
    if isinstance(context, dict):
        return context.get(key, default)
    return getattr(context, key, default)


# ---------------------------------------------------------------------------
# Policy Authorization Engine
# ---------------------------------------------------------------------------
def authorize(
    tool_name: str,
    args: dict[str, Any],
    context: Any,
    db: Optional[Session] = None,
) -> dict[str, Any]:
    """
    Evaluates tool authorization request against strict deterministic safety rules.
    Returns {decision, tier, rule, reason}.
    Rules are evaluated in order and stop at the first match.
    """

    # -----------------------------------------------------------------------
    # R0: escalate_to_human is always ALLOW
    # -----------------------------------------------------------------------
    if tool_name == "escalate_to_human":
        return {
            "decision": "ALLOW",
            "tier": "tier 1",
            "rule": "R0",
            "reason": "escalate_to_human is always allowed.",
        }

    # -----------------------------------------------------------------------
    # R1: Unknown tool or missing/malformed args -> ESCALATE
    # -----------------------------------------------------------------------
    if tool_name not in TOOL_REQUIRED_ARGS:
        return {
            "decision": "ESCALATE",
            "tier": "tier 3",
            "rule": "R1",
            "reason": f"Unknown tool '{tool_name}'.",
        }

    if not isinstance(args, dict):
        return {
            "decision": "ESCALATE",
            "tier": "tier 3",
            "rule": "R1",
            "reason": "Malformed args: args must be a dictionary.",
        }

    for req_arg in TOOL_REQUIRED_ARGS[tool_name]:
        val = args.get(req_arg)
        if val is None or not isinstance(val, str) or not val.strip():
            return {
                "decision": "ESCALATE",
                "tier": "tier 3",
                "rule": "R1",
                "reason": f"Missing or malformed required argument '{req_arg}' for tool '{tool_name}'.",
            }

    # -----------------------------------------------------------------------
    # R2: Merchant ID / Device ID ownership check
    # -----------------------------------------------------------------------
    ctx_merchant_id = _get_ctx(context, "merchant_id")

    if "merchant_id" in args:
        if args["merchant_id"] != ctx_merchant_id:
            return {
                "decision": "ESCALATE",
                "tier": "tier 3",
                "rule": "R2",
                "reason": f"merchant_id in args ('{args.get('merchant_id')}') does not match context merchant_id ('{ctx_merchant_id}').",
            }

    if "device_id" in args:
        device_id = args["device_id"]
        close_session = False
        if db is None:
            db = SessionLocal()
            close_session = True
        try:
            stmt = select(Device).where(Device.id == device_id)
            device = db.scalars(stmt).first()
            if not device or device.merchant_id != ctx_merchant_id:
                return {
                    "decision": "ESCALATE",
                    "tier": "tier 3",
                    "rule": "R2",
                    "reason": f"device_id '{device_id}' does not belong to context merchant '{ctx_merchant_id}'.",
                }
        finally:
            if close_session:
                db.close()

    # -----------------------------------------------------------------------
    # R3 & R3b: Tier 3 Check (Intent scan or raw transcript keyword scan)
    # -----------------------------------------------------------------------
    ctx_intent = _get_ctx(context, "intent")
    raw_transcript = _get_ctx(context, "transcript")

    is_tier_3 = False
    tier_3_reason = ""
    if ctx_intent in TIER_3_INTENTS:
        is_tier_3 = True
        tier_3_reason = f"Intent '{ctx_intent}' requires Tier 3 escalation."
    else:
        matched_keyword = scan_transcript_for_keywords(raw_transcript)
        if matched_keyword:
            is_tier_3 = True
            tier_3_reason = f"Transcript keyword '{matched_keyword}' triggered Tier 3 escalation."

    if is_tier_3:
        if tool_name == "send_reply":
            return {
                "decision": "ALLOW",
                "tier": "tier 1",
                "rule": "R3b",
                "reason": f"send_reply is allowed even on a Tier 3 ticket ({tier_3_reason})",
            }
        return {
            "decision": "ESCALATE",
            "tier": "tier 3",
            "rule": "R3",
            "reason": tier_3_reason,
        }

    # send_reply is always ALLOW (tier 1)
    if tool_name == "send_reply":
        return {
            "decision": "ALLOW",
            "tier": "tier 1",
            "rule": "R3b",
            "reason": "send_reply is allowed (tier 1).",
        }

    # -----------------------------------------------------------------------
    # R4: Low STT confidence on critical actions without confirmation
    # -----------------------------------------------------------------------
    if tool_name in ("restart_device", "create_technician_ticket"):
        stt_conf = _get_ctx(context, "stt_confidence")
        if stt_conf is not None and isinstance(stt_conf, (int, float)) and stt_conf < CONFIDENCE_THRESHOLD:
            confirmed_actions = _get_ctx(context, "confirmed_actions") or []
            ctx_ticket_id = _get_ctx(context, "ticket_id")
            has_matching_confirmation = any(
                ca.get("tool") == tool_name and ca.get("ticket_id") == ctx_ticket_id
                for ca in confirmed_actions
            )
            if not has_matching_confirmation:
                return {
                    "decision": "NEEDS_MERCHANT_CONFIRM",
                    "tier": "tier 2A",
                    "rule": "R4",
                    "reason": f"STT confidence {stt_conf} is below threshold {CONFIDENCE_THRESHOLD} and action is not yet confirmed by merchant.",
                }

    # -----------------------------------------------------------------------
    # R5: restart_device requires same-ticket merchant confirmation
    # -----------------------------------------------------------------------
    if tool_name == "restart_device":
        confirmed_actions = _get_ctx(context, "confirmed_actions") or []
        ctx_ticket_id = _get_ctx(context, "ticket_id")
        has_restart_confirm = any(
            ca.get("tool") == "restart_device" and ca.get("ticket_id") == ctx_ticket_id
            for ca in confirmed_actions
        )
        if has_restart_confirm:
            return {
                "decision": "ALLOW",
                "tier": "tier 2A",
                "rule": "R5",
                "reason": "restart_device confirmed by merchant for this ticket.",
            }
        return {
            "decision": "NEEDS_MERCHANT_CONFIRM",
            "tier": "tier 2A",
            "rule": "R5",
            "reason": "restart_device requires explicit merchant confirmation.",
        }

    # -----------------------------------------------------------------------
    # R6: create_technician_ticket requires human approval
    # -----------------------------------------------------------------------
    if tool_name == "create_technician_ticket":
        return {
            "decision": "NEEDS_HUMAN_APPROVAL",
            "tier": "tier 2B",
            "rule": "R6",
            "reason": "create_technician_ticket requires supervisor approval.",
        }

    # -----------------------------------------------------------------------
    # R7: Lookups are allowed (tier 1)
    # -----------------------------------------------------------------------
    if tool_name in ("get_merchant", "get_settlement_status", "get_device_health"):
        return {
            "decision": "ALLOW",
            "tier": "tier 1",
            "rule": "R7",
            "reason": f"{tool_name} lookup is allowed.",
        }

    # -----------------------------------------------------------------------
    # Anything else -> ESCALATE
    # -----------------------------------------------------------------------
    return {
        "decision": "ESCALATE",
        "tier": "tier 3",
        "rule": "FALLBACK",
        "reason": f"Unhandled tool or condition: '{tool_name}'.",
    }

