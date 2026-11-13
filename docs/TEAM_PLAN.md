# Team plan and git workflow

## Git rules
- `main` always runs. Never push broken code to it
- Branches: `a/agent`, `b/backend`, `c/web`. Open small pull requests and merge at least every few hours
- Commit messages: short and specific ("add policy engine and tests")
- Never commit `.env`. If a key leaks, rotate it immediately
- B pushes `backend/app/main.py` and the DB models first so A and C can pull them

## Milestones
| When | Milestone | Owner |
|---|---|---|
| Fri night | Seeded DB + mock API + policy tests passing | B |
| Fri night | Typed input works for m1 to m5 | A (needs B's tools) |
| Fri night | Merchant page and console built against fake data | C |
| Sat day | Voice round trip, scheduler, real API wired to UI | A, C |
| Sat evening | Trace view, dashboard, eval numbers, backup video | all |
| Sun | Feature freeze: fixes and rehearsal only | all |

If travelling to Pune on Saturday, freeze features before you leave and pack: laptop chargers,
phone hotspot, recorded backup video, and the demo script.

## Demo scenarios (lock these four)
1. Proactive: Soundbox offline -> auto restart -> spoken alert (m1, via Simulate outage)
2. Reactive voice: settlement missing + speaker off, two issues, one answer (m3 or m1)
3. Tier 2: suspected hardware fault -> technician proposal -> one-click approval (m2)
4. Tier 3: unauthorised transaction -> refusal and escalation with summary (m4)

Optional only if everything is stable: a small mocked sales offer after a fix.

## Open questions to confirm with the organisers
- Is code written before the event allowed?
- Venue, timings, build duration, team size
- Judging criteria and demo format
- Any API credits or sandbox on site

## Truth rule for the deck
Update the slides to match what is built: Groq as the LLM, SQLite or Postgres (whichever
you ship), only the languages that really work, and metrics labelled as targets or measured.
