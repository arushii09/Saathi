# Shared contracts (read this first)

Agree on these today so A, B and C can build in parallel. If you need to change one,
tell the others and update this file in the same PR.

## Tiers
`1` = auto, `2` = needs approval, `3` = human only.

## Policy decision (B produces, A consumes)
```json
{ "decision": "ALLOW | NEEDS_APPROVAL | ESCALATE", "tier": 1, "reason": "string" }
```
`authorize(tool_name, args, context) -> decision`. `context` includes `intents`,
`stt_confidence`, `transcript`.

## Tools (B implements, A exposes to the LLM)
| Tool | Args | Tier |
|---|---|---|
| get_merchant | merchant_id | 1 |
| get_device_health | device_id | 1 |
| get_settlement_status | merchant_id | 1 |
| restart_device | device_id | 1 |
| create_technician_ticket | device_id, diagnosis | 2 |
| escalate_to_human | ticket_id, summary | 3 (always allowed) |
| send_reply | ticket_id, text, language | 1 |

## Mock Paytm API (B builds, served under /mock)
- `GET  /mock/merchants/{merchant_id}`
- `GET  /mock/devices/{device_id}/health` returns `{device_id, status: online|offline, last_heartbeat, error_code}`
- `GET  /mock/settlements?merchant_id=` returns a list of `{date, amount, status, expected_by}`
- `POST /mock/devices/{device_id}/restart`
- `POST /mock/technician-tickets`

## Public API (what the web app calls)
- `POST /voice` multipart: `audio` (wav, under 30s), `merchant_id`, `language_hint` (optional)
  returns `{ticket_id, transcript, language, confidence, reply_text, reply_audio_url, tier, status}`
- `POST /text` JSON `{merchant_id, text}` returns the same shape (for testing without audio)
- `GET  /tickets` list, with `?status=` filter
- `GET  /tickets/{id}` includes the full decision trace
- `GET  /approvals` pending Tier 2 items
- `POST /approvals/{id}/approve` and `POST /approvals/{id}/reject`
- `GET  /escalations` Tier 3 items with summaries
- `POST /simulate/outage` JSON `{device_id}` flips a device offline (for the live demo)
- `GET  /metrics` tickets by tier, avg time to resolution, downtime minutes recovered, escalations with summary

## Ticket status
`open | resolved_auto | pending_approval | escalated | closed`

## Audit log row (B owns the table, everyone writes through B's helper)
`{ticket_id, step_no, type: input|tool_call|policy|tool_result|reply|escalation, payload (json), created_at}`

## Languages
`hi` and `en` first. Add `gu` only if STT and TTS both work for it.

## Seed merchants (B creates; A and C test against these)
| id | Scenario |
|---|---|
| m1 | Device offline, network drop. Tier 1 restart fixes it |
| m2 | Device offline, hardware fault suspected. Tier 2 technician |
| m3 | Settlement in bank processing window. Informational |
| m4 | Fraud complaint. Tier 3 escalate |
| m5 | Healthy control |
