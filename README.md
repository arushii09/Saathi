# Paytm Saathi (Transiq)

Voice-first, vernacular AI support teammate for small Paytm merchants.
Paytm Build for India AI Hackathon, Track 3: Autonomous AI Teammates.

> **Honesty note:** Paytm's real APIs and data are not public. This prototype runs on
> **mock services and synthetic data**. All metrics in the docs are **targets to validate**,
> not measured results, until the eval script produces real numbers.

## What it does
A merchant sends a voice note (Hindi / English). Saathi transcribes it, diagnoses the issue
using device and settlement tools, acts within a risk tier, replies by voice, and logs every step.
It also detects offline Soundboxes proactively, before the merchant complains.

- **Tier 1 (auto):** lookups, remote device restart, informational replies
- **Tier 2 (approve):** technician visit, settlement retry. A human approves in one click
- **Tier 3 (human only):** money movement, KYC, bank details, fraud, low confidence. Escalate with a summary

The LLM proposes. A plain-code policy engine authorises.

## Repo layout
```
backend/   FastAPI: mock Paytm services, tools, policy engine, agent loop, voice
web/       Next.js: merchant voice page, agent console, outcomes dashboard
eval/      Test voice clips and the accuracy / time-to-resolution script
docs/      Contracts, role plans, demo script
```

## Quick start (backend)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then fill in keys
uvicorn app.main:app --reload --port 8000
```
Open http://localhost:8000/docs once `app/main.py` exists (Person B creates it first).

## Quick start (web)
```bash
cd web
npx create-next-app@latest . --ts --app --tailwind --eslint --no-src-dir --import-alias "@/*"
cp .env.example .env.local
npm run dev
```

## Team
| Person | Owns | Doc |
|---|---|---|
| A | Agent loop (Groq), voice (Sarvam), scheduler | docs/ROLE_A_agent_voice.md |
| B | Database, mock Paytm API, tools, policy engine, audit log | docs/ROLE_B_backend_policy.md |
| C | Merchant page, agent console, dashboard | docs/ROLE_C_frontend.md |

Everyone reads `docs/CONTRACTS.md` first. It is the shared API and data shapes that let you
work in parallel.

## Rules
- Never commit `.env` or any API key.
- Branch per person: `a/agent`, `b/backend`, `c/web`. Open small PRs into `main`, merge often.
- Do not claim a feature in the deck unless it works in the demo.
