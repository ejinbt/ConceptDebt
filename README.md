# Concept Debt

A debugger for learning. It traces repeated maths mistakes through a prerequisite
graph to the smaller concept that's actually broken, then gives targeted repair
questions and re-measures.

**detect → trace → repair → verify**

```
wrong answer → misconception → prerequisite graph → debt score → repair questions
```

## Run the backend

One-time setup creates the Python virtualenv in `backend/.venv`, installs
everything and copies `.env.example` to `.env`:

```bash
cd backend
./setup.sh && source .venv/bin/activate              # Linux / macOS
# .\setup.ps1 ; .\.venv\Scripts\Activate.ps1          # Windows PowerShell
uvicorn app.main:app --reload
```

Put your Featherless key in `backend/.env` (`AI_API_KEY=`) to switch the AI on.

- Test UI: http://localhost:8000/
- API docs: http://localhost:8000/docs
- Frontend integration spec: [`docs/API.md`](docs/API.md)
- Test checklist: [`docs/TESTING.md`](docs/TESTING.md)

The database (SQLite by default) is created and seeded on first start.
Reset it with `python -m app.seed --reset`. Run tests with `pytest`.

Docker: `docker build -t conceptdebt backend && docker run -p 8000:8000 --env-file backend/.env conceptdebt`

## Configuration (`backend/.env`)

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `sqlite:///backend/conceptdebt.db` | For Supabase: `postgresql+psycopg://postgres:<password>@db.<ref>.supabase.co:5432/postgres` |
| `AI_API_KEY` | empty | Featherless key. Empty = AI off, app still works on rules + templates |
| `AI_BASE_URL` | `https://api.featherless.ai/v1` | Any OpenAI-compatible endpoint |
| `AI_MODEL` | `Qwen/Qwen2.5-72B-Instruct` | Any chat model your plan includes |
| `AI_DISABLED` | `0` | `1` switches AI off without removing the key |
| `CORS_ORIGINS` | `*` | Comma-separated list for production |

## How it works

| Layer | Where | What |
|---|---|---|
| Knowledge | `backend/seed/*.json` | 25 concepts with prerequisites, 8 misconceptions, 13 diagnostic + 23 repair questions |
| Checking | `app/checker.py` | sympy equivalence (`6 + 3x` = `3x + 6`), known-wrong-answer matching |
| AI (optional) | `app/ai.py` | Classifies unknown wrong answers from the student's working, writes the explanation, generates repair questions. JSON output is validated; any failure falls back to deterministic logic |
| Debt engine | `app/engine/scoring.py` | frequency × recency × prerequisite impact × confidence |
| Trace | `app/engine/trace.py` | Picks the concept whose debt best explains all failed topics, and the chain back to it |
| API | `app/routes/` | FastAPI |

Scoring in one paragraph: each wrong answer is evidence weighted by confidence
(0.9 for a known wrong answer, ≤0.85 from the AI, 0.3 unclassified) and recency
(×0.95 per later attempt). It lands on the misconception's concept; the failed
topic and the chain in between get a share, and prerequisites get a decaying share.
Correct answers pay debt down. `debt% = 100 × (1 − e^(−raw × impact / K))`, where
impact grows with the number of concepts that depend on it. All constants sit at
the top of `scoring.py`.

The demo student (`POST /api/demo/session`) scores 46%, gets diagnosed with
**Distributive Property at 85.2% debt** (6 mistakes across 5 topics), and drops to
**24.5%** after three correct repair answers.

## Layout

```
backend/
  app/
    main.py          FastAPI app, CORS, static test UI
    config.py db.py models.py schemas.py seed.py
    checker.py       answer checking
    ai.py            optional LLM layer
    services.py      DB <-> engine glue
    engine/          graph, scoring, trace (pure Python, no DB)
    routes/          learning flow + content endpoints
  seed/              concept graph and question bank
  static/index.html  Bootstrap test UI
  tests/
docs/
  API.md             frontend integration spec
  openapi.json       generated schema (python scripts/export_openapi.py)
```
