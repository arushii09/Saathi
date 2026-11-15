# Shared contracts (Paytm Saathi). Change only after telling the team.

## Decisions (policy returns these)
authorize(tool_name, args, context) -> {decision, tier, rule, reason}
decision: ALLOW | NEEDS_MERCHANT_CONFIRM (tier 2A) | NEEDS_HUMAN_APPROVAL (tier 2B) | ESCALATE (tier 3)
context: merchant_id, ticket_id, transcript, language, intent, stt_confidence (may be null), confirmed_actions [{tool, ticket_id, at}]
The LLM only proposes. Policy is plain code. Only server code records a merchant's yes: the confirm route or detect_yes_no.

## Tools (all return {ok, data, error}, never raise)
get_merchant(merchant_id), get_device_health(device_id), get_settlement_status(merchant_id), restart_device(device_id), create_technician_ticket(device_id, diagnosis), escalate_to_human(ticket_id, summary), send_reply(ticket_id, text, language).
There is deliberately no settlement-retry tool.

## Policy rules (in order)
R0 escalate_to_human ALLOW. R1 unknown tool or bad args ESCALATE. R2 merchant_id or device_id must belong to context.merchant_id else ESCALATE. R3 Tier 3 intent or keyword scan -> ESCALATE for every tool EXCEPT send_reply and escalate_to_human. R3b send_reply ALLOW even on Tier 3. R4 low stt_confidence AND no matching confirmation -> NEEDS_MERCHANT_CONFIRM. R5 restart_device ALLOW only with a same-ticket confirmation else NEEDS_MERCHANT_CONFIRM. R6 create_technician_ticket NEEDS_HUMAN_APPROVAL. R7 lookups ALLOW.
On ESCALATE the server sends a fixed Hindi or English template through send_reply, with no LLM.

## Ticket
status: open | awaiting_merchant | resolved_auto | pending_approval | escalated | resolved | closed
fields: id, merchant_id, source, status, tier, intent, transcript, language, stt_confidence, audio_ref, reply_text, pending_tool, pending_args (json), created_at, resolved_at
pending_tool and pending_args are set when policy returns NEEDS_MERCHANT_CONFIRM. The confirm route returns 409 unless status is awaiting_merchant.

## Audit log (append-only)
{ticket_id, step_no (per ticket), type, payload (json), created_at}
type: input | tool_call | policy | tool_result | reply | escalation | merchant_confirmation | approval_decided

## Handoff case file (7 fields)
ticket_id, merchant (id, name, shop, language), issue (transcript and intent), checks_done, actions_taken, escalation_reason (rule id and reason), recommended_next_step

## Error shape (every route)
{ "error": { "code": "string", "message": "string" } }

## Mock Paytm API (/mock)
GET /mock/merchants/{id}
GET /mock/devices/{device_id}/health -> {device_id, status online|offline, last_heartbeat, error_code}
GET /mock/settlements?merchant_id= -> [{date, amount, status, expected_by}]
POST /mock/devices/{device_id}/restart -> {accepted: true}
POST /mock/technician-tickets -> 201 {status: "scheduled", ...}

## Routes (B builds, C calls, A calls /tickets and confirm helpers)
GET /health
POST /text and POST /voice (A builds)
GET /tickets (?status=), GET /tickets/{id} (ticket + trace)
POST /tickets/{id}/confirm {answer: yes|no}
GET /approvals, POST /approvals/{id}/approve, POST /approvals/{id}/reject
GET /escalations
POST /simulate/outage {device_id}
POST /admin/reset
GET /metrics

## Seed (device ids SB-1001 to SB-1005 for m1 to m5)
m1 Ramesh Patel, hi: device offline, network fault. Restart fixes it after about 2 seconds.
m2 Imran Shaikh, en: device online, yesterday's settlement status "processing". Informational reply.
m3 Sunita Sharma, hi: device offline, hardware fault (HW_SPEAKER_FAULT). Restart does NOT fix it. Technician ticket needs human approval.
m4 Kavita Joshi, hi: fraud complaint. Device online. Tier 3 escalate.
m5 Arjun Mehta, en: device offline (network fault) AND settlement processing together.

## Languages
hi and en. Devanagari, Hinglish and English input all work.
