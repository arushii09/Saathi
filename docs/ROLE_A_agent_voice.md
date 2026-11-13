# Person A: Agent loop (Groq), voice (Sarvam), scheduler

You build the brain and the voice. Start with Step 0 below while B builds the backend.

## Step 0 (first hour): prove the two APIs work
Write two throwaway scripts in `backend/scripts/` (not part of the app):
1. **Groq tool-calling test**: send one message with one dummy tool schema, and confirm you get a tool call back. Check the Groq console for a current model that supports tool calling and put it in `.env` as `GROQ_MODEL`.
2. **Sarvam test**: one speech-to-text call on a 5-second Hindi clip and one text-to-speech call. Copy the request format from Sarvam's current docs. Note the STT response fields (transcript, language, any confidence value).

If a key or endpoint fails, tell the team immediately.

## Order of work
1. **`app/llm.py`**: thin wrapper around the Groq client. One function, `chat(messages, tools)`.
2. **`app/agent.py`**: the loop, up to about 5 iterations:
   - system prompt: Paytm merchant support teammate, diagnose with tools, propose actions, reply briefly in the merchant's language, never promise money movement
   - model proposes a tool call -> `policy.authorize(...)` (from B)
   - ALLOW -> run the tool; NEEDS_APPROVAL -> create an approval row and tell the merchant a human will confirm; ESCALATE -> call `escalate_to_human` with a summary and stop acting
   - log every step through `audit.log(...)`
   - return `{reply_text, tier, status}`
3. **`POST /text`**: runs the agent on typed input. Test all five seeded merchants here before touching voice. **This is the milestone for tonight.**
4. **`app/voice.py`**: `stt(audio) -> {transcript, language, confidence}` and `tts(text, language) -> audio file`, both behind one small interface so recorded clips can replace them if the API fails.
5. **`POST /voice`**: audio in, calls STT, passes transcript and confidence to the agent, calls TTS, returns the contract shape and a playable audio URL.
6. **Low-confidence rule**: below the threshold, reply with a read-back question ("Aapka kal ka settlement, sahi?") instead of acting.
7. **`app/scheduler.py`** (APScheduler): every N seconds scan devices with stale heartbeats. For each, start the same agent loop with no voice note, restart the device, and generate a spoken alert. Wire `POST /simulate/outage` (B creates the route) to this.
8. **`eval/run_eval.py`**: run the clips in `eval/clips/` through `/voice`, with expected transcripts in a CSV. Output word accuracy and time to resolution to `eval/results/`. Report only real numbers in the demo.

## Prompting tips
Keep the tool list small and descriptions precise. Put the merchant id in the context so the model does not ask for it. Keep replies under about 200 characters so TTS stays fast.

## Definition of done
- Typed input works for all five merchants with the right tier each time
- Voice round trip works in Hindi and English
- Proactive alert fires when an outage is simulated
- Eval script produces a results file
