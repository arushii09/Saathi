# Person C: Merchant page, agent console, dashboard

You build everything judges will see. **Build against fake data first** so you are never
blocked on A or B, then switch to the real API.

## Setup
```bash
cd web
npx create-next-app@latest . --ts --app --tailwind --eslint --no-src-dir --import-alias "@/*"
cp .env.example .env.local
```
Create `lib/api.ts` with one function per endpoint in `docs/CONTRACTS.md`. Start each one
returning fake JSON in the contract shape. Flip to real `fetch` calls when B's routes are up.

## Screen 1: Merchant page (`/`), mobile-first
Match your Figma prototype:
- merchant card (name, city, Soundbox id, online/offline badge)
- language dropdown (Hindi, English)
- **hold-to-speak** button using the browser `MediaRecorder`. Export WAV (16 kHz mono works best for Sarvam). If WAV is hard, record webm and ask A for server-side conversion
- transcript with language and confidence chips
- spoken reply with a play button, plus the text copy
- status label: "Resolved automatically (Tier 1)", "Waiting for human approval", or "Escalated to a human"
- a **demo scenario picker** (m1 to m5) so you can switch merchants in one click on stage

## Screen 2: Agent console (`/console`), the hero screen
Three views:
1. **Approval queue**: Tier 2 items with a one-click Approve and Reject button
2. **Escalation inbox**: Tier 3 cases showing the agent's summary
3. **Decision trace** (`/console/tickets/[id]`): a vertical timeline from `GET /tickets/{id}`: what the merchant said, each tool the agent called, the **policy decision and reason**, the result, the final reply. Make policy decisions visually obvious (green Tier 1, amber Tier 2, red Tier 3)

Add a **Simulate outage** button that calls `POST /simulate/outage`, so the proactive scenario can be triggered live.

## Screen 3: Outcomes dashboard (`/dashboard`)
From `GET /metrics`: tickets by tier, average time to resolution, downtime minutes recovered,
escalations with summary. Label it "Synthetic data". Put proposed targets beside measured
values, labelled "target".

## Polish checklist (do last)
- loading and error states (the demo must never show a blank screen)
- readable on a phone-sized viewport for `/`, and on a laptop for `/console`
- consistent colours with your deck (navy, blue, tier colours)
- the "Offline" badge must update to "Online" after a fix (it was inconsistent in the deck screenshot)

## Definition of done
- All three screens work against the real API
- A full scenario can be run end to end by clicking only
- No console errors during a rehearsal run
