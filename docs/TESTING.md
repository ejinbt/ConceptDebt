# Backend test checklist

Run through this before handing the backend to the frontend or demoing it.
Start the server first:

```bash
cd backend
source .venv/bin/activate          # Windows: .\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

## 1. Setup
- [x] `python -m pytest` → all tests pass (plain `pytest` can pick up a global install)
- [x] http://localhost:8000/api/health → `"status": "ok"`
- [x] http://localhost:8000/docs opens (Swagger UI)
- [x] http://localhost:8000/ opens the tester page, styled (Bootstrap loaded)

## 2. AI (Featherless)
- [x] Key is in `backend/.env` as `AI_API_KEY=...`, server restarted
- [x] `/api/health` → `"ai_enabled": true` and the model name
- [] Tester: start a test, answer **Q5 `Expand 3(x + 2)`** with `3x + 5` and working
      `I multiplied 3 by x and added 5` → request log shows `"source": "ai"` with a
      misconception and a `rationale` (or `"unclassified"` if the model wasn't sure)
- [ ] Time it: wrong answers it doesn't recognise should come back in < 5 s.
      If slower, try a smaller `AI_MODEL`
- [ ] Click **Debug learning** → explanation ends with `[ai]`, reads naturally,
      mentions the root concept
- [ ] Top-right of the tester (or `/api/health` → `ai_stats`) shows mostly `ok`, few `failed`.
      Hover "failed" to see the last error. Lots of failures means change the model
- [ ] Set `AI_DISABLED=1`, restart → everything still works, explanation shows `[template]`

## 3. Demo flow (the one judges see)
- [ ] **Load demo student** → score **46%** (6 of 13)
- [ ] **Debug learning** → root **Distributive Property ~85%**, 6 mistakes, trace ends on it
- [ ] Graph: root is red, trace nodes amber
- [ ] **Repair the root** → 3 questions on Distributive Property
- [ ] Answer `4x + 20`, `-3x - 6`, `10x - 5` → each shows ✓
- [ ] Result → **85.2% → 24.5%**, 3/3 correct

## 4. Real diagnostic
- [ ] **Start new diagnostic**, answer all 13 correctly → 100%, Debug says no root found
- [ ] New session, answer Q1 with `2/5` → after Debug, Fraction Operations shows debt
- [ ] Equivalent answers are accepted: `6 + 3x`, `3*x+6`, `x = 7`, `x²`, `0.8333` for `5/6`
- [ ] Q11 (factorise): `6x + 9` is marked wrong, `3(2x + 3)` is right
- [ ] Junk input (`hello`, `)))`, `idk`) shows "doesn't look like a maths answer", stays on the
      question, and doesn't change the score or debt (`"source": "invalid"`)

## 5. Navigation (tester page)
- [ ] **← Previous** and **Skip →** move between questions
- [ ] Number pills jump to any question; answered ones are filled in
- [ ] Going back shows your earlier answer; **Update answer** replaces it
      (the attempts list still has one entry for that question)
- [ ] Browser back/forward buttons move between screens
- [ ] Refresh mid-test → same session, same question
- [ ] **Finish test** early asks for confirmation, then shows the score
- [ ] Top bar steps unlock as you go (Score → Debugger → Repair → Result)
- [ ] From Result: back to repair questions, change an answer, open Result again → numbers update
- [ ] **End session** → back to Start with a clean slate

## 6. API edge cases (from /docs)
- [ ] `GET /api/sessions/nope` → 404
- [ ] `POST /api/sessions/{id}/repair` before debug → 409
- [ ] `POST /api/sessions/{id}/reverify` before debug → 409
- [ ] `POST /api/attempts` with unknown `question_id` → 404, empty `answer` → 422
- [ ] `GET /api/graph` → 25 nodes, edges go prerequisite → dependent
- [ ] `GET /api/teacher/overview` after a few debugged sessions → concept totals

## 7. Database
- [ ] `python -m app.seed --reset` → `seeded`, app starts fresh
- [ ] Supabase: set `DATABASE_URL` to the Postgres URL, restart, run section 3 again
- [ ] Frontend teammate can call the API from their dev server (no CORS error in the browser console)
