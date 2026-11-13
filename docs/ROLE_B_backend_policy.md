# Person B: Backend, mock Paytm, tools, policy engine

You build the foundation everyone else depends on. **Your first deliverable is a running
FastAPI app with seeded data within about 2 hours.** Push it early so A and C can start.

## Order of work
1. **`backend/app/main.py`**: FastAPI app, CORS from `ALLOWED_ORIGINS`, mounts routers. Push this first, even empty.
2. **`app/db.py` and `app/models.py`** (SQLAlchemy, SQLite): `merchants`, `devices`, `settlements`, `tickets`, `audit_log`, `approvals`.
3. **`seed/seed.py`**: creates the five merchants m1 to m5 from `CONTRACTS.md`. Running it twice must not duplicate data.
4. **`app/mock/`**: the five mock endpoints under `/mock`. `restart_device` should flip the device to online after about 2 seconds (a background task or a timestamp check is fine).
5. **`app/tools.py`**: the seven tool functions from CONTRACTS. They call the mock API. Each returns plain dicts.
6. **`app/policy.py`**: `authorize(tool_name, args, context)` as ordinary code, no LLM:
   - lookups, `restart_device`, `send_reply` -> ALLOW (Tier 1)
   - `create_technician_ticket` -> NEEDS_APPROVAL (Tier 2)
   - any fraud / money / KYC / bank-detail keyword or intent in context -> ESCALATE (Tier 3)
   - `stt_confidence` below `CONFIDENCE_THRESHOLD` -> ESCALATE or ask to confirm
   - unknown tool -> ESCALATE
7. **`tests/test_policy.py`**: at least 10 tests. This is your proof that safety is in code. Run `pytest`.
8. **`app/audit.py`**: `log(ticket_id, type, payload)` helper that auto-increments `step_no`. A calls this.
9. **Routes** (`app/routes/`): `/tickets`, `/tickets/{id}`, `/approvals`, approve/reject, `/escalations`, `/simulate/outage`, `/metrics`. Approve on a technician approval should create the technician ticket and log it.
10. **`/metrics`**: computed from `tickets` and `audit_log` (tickets by tier, avg time to resolution, downtime minutes recovered).

## Interfaces you must keep stable
`authorize(...)`, the tool function signatures, `audit.log(...)`, and the response shapes in `CONTRACTS.md`.

## Definition of done
- `pytest` passes
- `python seed/seed.py` then every mock endpoint works in `/docs`
- A can call your tools and `authorize` from the agent loop
- C can fetch `/tickets`, `/approvals`, `/escalations`, `/metrics` with real rows

## Later (if time)
Swap SQLite for Postgres only if it takes under an hour. Otherwise keep SQLite and correct the deck.
