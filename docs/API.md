# Concept Debt API: frontend integration spec

Everything the frontend needs to talk to the backend. If this page and the live
docs ever disagree, the live docs win: **http://localhost:8000/docs** (Swagger UI,
you can call every endpoint from there). The raw schema is in
[`openapi.json`](./openapi.json) if you want to generate a typed client.

- **Base URL (local):** `http://localhost:8000`. All endpoints are under `/api`.
- **Format:** JSON in, JSON out. Send `Content-Type: application/json`.
- **Auth:** none. A student is identified by a `session_id` from `POST /api/sessions`.
  Keep it in state (or `localStorage`) and send it with every call.
- **CORS:** open (`*`) by default, so a Vite dev server on `:5173` can call `:8000` directly.
- **Errors:** non-2xx responses look like `{"detail": "message"}`. Status codes used:
  `404` unknown session/question, `409` step called out of order, `422` invalid body.

---

## 1. The flow

```
GET /classes ─▶ POST /sessions {grade} ─▶ GET /diagnostic?session_id= ─▶ POST /attempts (×15)
                                          │
              GET /sessions/{id}/score ◀──┘   ← show the plain "53%" (the symptom)
                     │
         POST /sessions/{id}/debug             ← "Debug learning": root, trace, debt table
         GET  /graph?session_id={id}           ← coloured concept graph
                     │
         POST /sessions/{id}/repair            ← 3 questions on the root concept
         POST /attempts (×3)                   ← same endpoint as the diagnostic
                     │
         POST /sessions/{id}/reverify          ← before/after: 86.4% → 23.3%
```

The session `phase` moves `diagnostic → debugged → repair → done`.

**Shortcut while building UI:** `POST /api/demo/session` creates a session with the
diagnostic already answered by the scripted demo student (weak on the distributive
property). Go straight to `/score` or `/debug` with it.

---

### NCERT classes: the rules

The student picks the **class they've completed: 8, 9 or 10** (default 10).

- The diagnostic only asks about **that class and earlier ones**. Nothing they haven't been taught.
- A root cause is only ever found in **the same or an earlier class**. Tracing goes downwards only:
  *"Class 10 Quadratic Equations is failing because of Class 7 Distributive Property."*
- Concepts **above** the student's class come back from `/graph` with `status: "locked"` and are
  never listed in the debt table. Grey them out.
- Every question has a **"Haven't learned this yet"** option (`not_learned: true` on `/attempts`).
  It's stored but never counts as debt or as a wrong answer.
- Concepts and roots carry `grade` and `ncert` (e.g. `"Class 7 · Algebraic Expressions"`),
  so the UI can say **"Revise NCERT Class 7 · Algebraic Expressions"**.

## 2. Answer format (what students can type)

Answers are checked with a maths engine, not string compare, so `6 + 3x`, `3x+6`
and `3*x + 6` are all the same answer.

| Type this | Means |
|---|---|
| `3x + 6`, `3*x + 6` | multiplication can be implicit |
| `x^2` or `x²` | powers |
| `5/6`, `0.8333` | fractions or decimals (numbers allow 0.5% tolerance) |
| `x = 7` or `7` | for "solve" questions, the part after `=` is used |
| `sqrt(2)` | square roots |
| `×  ·  ÷  −` | unicode operators are accepted |

Question `kind` tells you what's expected:

| kind | Expected answer |
|---|---|
| `number` | a single value |
| `expression` | any equivalent algebraic expression |
| `factored` | must be equivalent **and** written as a product, e.g. `3(2x + 3)`. `6x + 9` is marked wrong |

Suggested UI hint under the input: *"Use ^ for powers, e.g. x^2"*.

---

## 3. Endpoints

### `GET /api/health`
```json
{
  "status": "ok",
  "ai_enabled": true,
  "ai_model": "Qwen/Qwen2.5-32B-Instruct",
  "ai_stats": { "calls": 12, "ok": 11, "failed": 1, "last_error": "AI rate limited (too many requests at once for your plan): ..." }
}
```
`ai_stats` counts AI requests since the server started. `failed` means the app fell
back to rules/templates for that request (nothing breaks), `last_error` says why.
`ai_enabled: false` means explanations come from templates and unknown wrong answers
aren't classified. Everything else works the same.

---

### `POST /api/sessions` → `201`
Body (all optional): `{ "grade": 9, "label": "alex" }`.
`grade` is the NCERT class completed, `8`, `9` or `10` (default `10`; anything else is `422`).
`label` is a nickname, max 80 chars; don't send real names or emails.
```json
{
  "session_id": "685d5ad4f2ee4e9e9a60f0985fcb2c87",
  "label": null,
  "grade": 9,
  "phase": "diagnostic",
  "root_concept_id": null,
  "answered": 0,
  "created_at": "2026-10-09T19:40:12.123456"
}
```

### `GET /api/sessions/{session_id}`
Same shape as above. Use it to restore a session after a page refresh.

### `POST /api/demo/session` → `201`
No body. Same shape, with `grade: 10`, `answered: 15` and `label: "demo"`.

---

### `GET /api/classes`
The options for the class picker.
```json
[
  { "grade": 8,  "label": "Class 8",  "questions": 12 },
  { "grade": 9,  "label": "Class 9",  "questions": 12 },
  { "grade": 10, "label": "Class 10", "questions": 15 }
]
```

### `GET /api/diagnostic?session_id={id}`
The diagnostic **for the session's class**, in order. **Answers are not included.**
Pass `session_id` (recommended) or `grade=8|9|10`; with neither you get Class 10.
```json
[
  {
    "id": "d01",
    "concept_id": "fractions",
    "concept_name": "Fractions",
    "ncert": "Class 6 · Fractions",
    "kind": "number",
    "prompt": "Work out 1/2 + 1/3",
    "is_repair": false
  }
]
```

---

### `POST /api/attempts` → `201`
Used for **both** diagnostic and repair questions.

Request:
```json
{
  "session_id": "685d5ad4...",
  "question_id": "d05",
  "answer": "3x + 2",
  "working": "3 times x is 3x, plus 2",
  "time_ms": 14200
}
```
**"Haven't learned this yet":** send `{ "session_id": "...", "question_id": "d14", "not_learned": true }`
(no `answer` needed). Answering the question for real later replaces the mark.
`working` (optional, ≤2000 chars) is the student's explanation; the AI reads it when the
wrong answer isn't a known one. `time_ms` is optional.

Response:
```json
{
  "attempt_id": 5,
  "question_id": "d05",
  "mode": "diagnostic",
  "answer": "3x + 2",
  "working": "3 times x is 3x, plus 2",
  "correct": false,
  "correct_answer": "3x + 6",
  "misconception": { "id": "partial_distribution", "name": "Distributes to the first term only" },
  "confidence": 0.9,
  "source": "rule",
  "rationale": "Answer matches a known wrong answer for this question."
}
```

| `source` | Meaning | `confidence` |
|---|---|---|
| `correct` | answer was right | 0 |
| `rule` | matched a known wrong answer for this question | 0.9 |
| `ai` | the AI classified it from the answer and working | ≤ 0.85 |
| `unclassified` | wrong, cause unknown (still counts as weak evidence) | 0.3 |
| `not_learned` | the student pressed "Haven't learned this yet". **Ignored by scoring and the score** | 0 |
| `invalid` | not a maths answer (`hello`, `)))`, `idk`, letters that aren't in the question). **Ignored by scoring and the score.** Ask the student to re-enter it | 0 |

**Re-answering is allowed.** Posting again for the same `question_id` in the same
session **replaces** the earlier attempt (it doesn't count twice), so a "Previous"
button can just re-submit. Use `GET /sessions/{id}/attempts` to prefill answers
after a page refresh.

**Demo tip:** during the diagnostic, don't show right/wrong. The reveal on the
score screen is the point of the demo. In repair mode, show it immediately.

The AI call adds a second or two to wrong answers that aren't recognised. Show a
spinner on the submit button.

### `GET /api/sessions/{session_id}/attempts`
Array of the attempt objects above (one per question, the latest answer), oldest first.

---

### `GET /api/sessions/{session_id}/score`
The plain score, the "symptom" screen from the demo.
```json
{ "session_id": "685d...", "answered": 15, "correct": 8, "total_questions": 15, "percent": 53.3 }
```

---

### `POST /api/sessions/{session_id}/debug`
**The "Debug learning" button.** Runs the engine, saves a "before" snapshot, stores the
root on the session, sets phase to `debugged`. Can be called again; it re-runs.
May take a few seconds when AI is on (it writes the explanation).

```json
{
  "session_id": "685d...",
  "grade": 10,
  "phase": "debugged",
  "answered": 15,
  "not_learned": 0,
  "wrong": 7,
  "root": {
    "concept_id": "distributive",
    "name": "Distributive Property",
    "grade": 7,
    "ncert": "Class 7 · Algebraic Expressions",
    "debt": 86.4,
    "confidence": 0.9,
    "coverage": 1.0,
    "mistakes": 6,
    "affected_topics": ["alg_manip", "expanding", "factoring", "linear_eq", "quadratics"],
    "misconceptions": [
      { "id": "partial_distribution", "name": "Distributes to the first term only", "count": 5 },
      { "id": "negative_distribution", "name": "Sign error distributing a negative", "count": 1 }
    ]
  },
  "trace": [
    { "concept_id": "quadratics",   "name": "Quadratic Equations",   "debt": 8.8 },
    { "concept_id": "expanding",    "name": "Algebraic Identities",  "debt": 34.3 },
    { "concept_id": "distributive", "name": "Distributive Property", "debt": 86.4 }
  ],
  "concepts": [
    {
      "concept_id": "distributive",
      "name": "Distributive Property",
      "level": 1,
      "grade": 7,
      "ncert": "Class 7 · Algebraic Expressions",
      "debt": 86.4,
      "mistakes": 6,
      "evidence_count": 7,
      "confidence": 0.9,
      "affected_topics": ["alg_manip", "expanding", "factoring", "linear_eq", "quadratics"],
      "misconceptions": [{ "id": "partial_distribution", "name": "Distributes to the first term only", "count": 5 }],
      "status": "root"
    }
  ],
  "explanation": {
    "summary": "6 of your 7 mistakes trace back to Distributive Property. Because later topics build on it, it is also breaking Simplifying Expressions, Algebraic Identities, Factorisation, Linear Equations in One Variable, Quadratic Equations.",
    "advice": "Revise NCERT Class 7 · Algebraic Expressions (Distributive Property) before going back to the harder topics.",
    "source": "template"
  }
}
```

How to use each part:

| Field | UI |
|---|---|
| `root` | The big diagnosis card: *"Distributive Property (Class 7): 86% debt, 90% confidence, 6 mistakes across 5 topics. Revise NCERT Class 7 · Algebraic Expressions"*. `null` if there's no clear root (e.g. no mistakes). |
| `trace` | The animated chain. **Ordered from the failed advanced topic down to the root**: animate left to right / top to bottom, ending on the root. |
| `concepts` | Debt dashboard cards/table. Only concepts with debt ≥ 1, sorted highest first. |
| `explanation` | Plain-language text under the diagnosis. `source` is `ai` or `template`. |

Field notes:
- `debt` is 0–100 (one decimal). It's a priority signal, not a mastery grade, so label it "debt", not "score".
- `confidence` is 0–1. Shows how sure the diagnosis is. It needs 3+ consistent mistakes to reach full value.
- `affected_topics` are concept ids; get names from `/api/concepts` or `/api/graph`.

### `GET /api/sessions/{session_id}/debt`
Same shape as `/debug`, but read-only (saves nothing, template explanation, fast).
Use it to refresh the dashboard live, e.g. after each repair answer.

---

### `GET /api/graph?session_id={id}`
Nodes and edges for **React Flow** or D3. Omit `session_id` for the plain graph (all debt 0).
```json
{
  "nodes": [
    { "id": "distributive", "name": "Distributive Property", "level": 1,
      "grade": 7, "ncert": "Class 7 · Algebraic Expressions",
      "description": "Multiplying a factor across every term inside brackets: a(b + c) = ab + ac.",
      "debt": 86.4, "status": "root" },
    { "id": "limits", "name": "Limits and Derivatives", "level": 5,
      "grade": 11, "ncert": "Class 11 · Limits and Derivatives",
      "description": "The value a function approaches, and rate of change.",
      "debt": 0.0, "status": "locked" }
  ],
  "edges": [
    { "id": "distributive->alg_manip", "source": "distributive", "target": "alg_manip" }
  ]
}
```
- Edges point **from the prerequisite to the concept that depends on it**, so the
  graph flows from Class 6 foundations to Class 11.
- `level` = `grade − 6` (0 = Class 6 … 5 = Class 11): a ready-made layout column. 26 nodes total.

`status` values (same in `/debug` → `concepts[]`):

| status | Meaning | Suggested colour |
|---|---|---|
| `root` | the diagnosed root cause | red |
| `trace` | on the chain between the failed topic and the root | amber |
| `failed` | the student got a question on this concept wrong | dark red / outline |
| `at_risk` | debt ≥ 10 from propagated evidence | muted amber |
| `ok` | nothing to see | neutral |
| `locked` | above the student's class: not taught yet, never shows debt | greyed out / 🔒 |

React Flow mapping:
```ts
const { nodes, edges } = await fetch(`${API}/graph?session_id=${id}`).then(r => r.json());
const byLevel: Record<number, number> = {};
const rfNodes = nodes.map(n => {
  const row = (byLevel[n.level] = (byLevel[n.level] ?? -1) + 1);
  return {
    id: n.id,
    position: { x: n.level * 220, y: row * 80 },
    data: { label: `${n.name}${n.debt >= 1 ? ` · ${Math.round(n.debt)}%` : ""}` },
    className: `node-${n.status}`,
  };
});
const rfEdges = edges.map(e => ({ ...e, animated: false }));
// To animate the trace: set animated: true on edges whose source and target are both
// in analysis.trace (consecutive pairs), revealing them one by one.
```

### `GET /api/concepts`
The full concept list with prerequisites and known misconceptions.
```json
[
  { "id": "linear_eq", "name": "Linear Equations in One Variable", "level": 2,
    "grade": 8, "ncert": "Class 8 · Linear Equations in One Variable",
    "description": "Solving equations of the form ax + b = c, including with brackets.",
    "prerequisites": ["alg_manip", "equality"],
    "misconceptions": [] }
]
```

---

### `POST /api/sessions/{session_id}/repair?count=3`
**Repair mode.** Returns `count` (1–5, default 3) questions on the root concept and
sets phase to `repair`. `409` if `/debug` hasn't found a root yet.
```json
{
  "session_id": "685d...",
  "root": { "concept_id": "distributive", "name": "Distributive Property", "debt": 86.4 },
  "questions": [
    { "id": "r-dist-1", "concept_id": "distributive", "concept_name": "Distributive Property",
      "kind": "expression", "prompt": "Expand 4(x + 5)", "is_repair": true }
  ]
}
```
Answer them with `POST /api/attempts` as usual. The response's `mode` will be `"repair"`.
If the root has no hand-written repair questions, the AI writes some (ids start with `gen-`).

### `POST /api/sessions/{session_id}/reverify`
**The result screen.** Recomputes debt, compares with the snapshot from `/debug`,
sets phase to `done`. `409` if `/debug` was never called.
```json
{
  "session_id": "685d...",
  "root_concept_id": "distributive",
  "root_before": 86.4,
  "root_after": 23.3,
  "changes": [
    { "concept_id": "distributive", "name": "Distributive Property", "before": 86.4, "after": 23.3, "change": -63.1 },
    { "concept_id": "order_ops", "name": "Order of Operations (BODMAS)", "before": 21.4, "after": 0.0, "change": -21.4 }
  ],
  "repair_answered": 3,
  "repair_correct": 3,
  "analysis": { "...": "same shape as /debug" }
}
```
`changes` is sorted biggest drop first. Use `analysis` to re-colour the graph.

---

### `GET /api/teacher/overview` (optional teacher view)
Class-level totals from every debugged session.
```json
{
  "sessions": 12,
  "debugged_sessions": 9,
  "concepts": [
    { "concept_id": "distributive", "name": "Distributive Property",
      "sessions_as_root": 5, "avg_debt": 61.3, "students_with_debt": 6 }
  ]
}
```

---

## 4. TypeScript types

```ts
export type Phase = "diagnostic" | "debugged" | "repair" | "done";
export type Status = "root" | "trace" | "failed" | "at_risk" | "ok" | "locked";
export type Grade = 8 | 9 | 10;
export type Kind = "number" | "expression" | "factored";

export interface ClassOut { grade: Grade; label: string; questions: number }
export interface SessionOut { session_id: string; label: string | null; grade: Grade; phase: Phase; root_concept_id: string | null; answered: number; created_at: string }
export interface QuestionOut { id: string; concept_id: string; concept_name: string; ncert: string; kind: Kind; prompt: string; is_repair: boolean }
export interface AttemptIn { session_id: string; question_id: string; answer?: string; working?: string | null; time_ms?: number | null; not_learned?: boolean }
export interface MisconceptionRef { id: string; name: string }
export interface MisconceptionCount extends MisconceptionRef { count: number }
export interface AttemptOut {
  attempt_id: number; question_id: string; mode: "diagnostic" | "repair"; answer: string; working: string | null; correct: boolean; correct_answer: string;
  misconception: MisconceptionRef | null; confidence: number; source: "rule" | "ai" | "unclassified" | "correct" | "invalid" | "not_learned"; rationale: string | null;
}
export interface ScoreOut { session_id: string; answered: number; correct: number; total_questions: number; percent: number }
export interface ConceptDebt {
  concept_id: string; name: string; level: number; grade: number; ncert: string; debt: number; mistakes: number; evidence_count: number;
  confidence: number; affected_topics: string[]; misconceptions: MisconceptionCount[]; status: Status;
}
export interface Root { concept_id: string; name: string; grade: number; ncert: string; debt: number; confidence: number; coverage: number; mistakes: number; affected_topics: string[]; misconceptions: MisconceptionCount[] }
export interface TraceStep { concept_id: string; name: string; debt: number }
export interface Analysis {
  session_id: string; grade: Grade; phase: Phase; answered: number; not_learned: number; wrong: number; root: Root | null; trace: TraceStep[];
  concepts: ConceptDebt[]; explanation: { summary: string; advice: string; source: "ai" | "template" };
}
export interface RepairOut { session_id: string; root: TraceStep; questions: QuestionOut[] }
export interface DebtChange { concept_id: string; name: string; before: number; after: number; change: number }
export interface ReverifyOut { session_id: string; root_concept_id: string | null; root_before: number; root_after: number; changes: DebtChange[]; repair_answered: number; repair_correct: number; analysis: Analysis }
export interface GraphNode { id: string; name: string; level: number; grade: number; ncert: string; description: string; debt: number; status: Status }
export interface GraphEdge { id: string; source: string; target: string }
```

Minimal client:
```ts
const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(API + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? res.statusText);
  return data as T;
}
// const s = await api<SessionOut>("POST", "/sessions", {});
```

---

## 5. Demo script (what the judges see)

1. `POST /demo/session` (or answer for real) → `GET /score` → show **53%**, nothing else.
2. Click **Debug learning** → `POST /debug` → animate `trace`, then reveal the `root` card.
3. Graph via `GET /graph?session_id=` → root red, trace amber.
4. **Repair** → `POST /repair` → 3 questions → `POST /attempts` each.
5. `POST /reverify` → **86.4% → 23.3%**, re-colour the graph from `analysis`.

Demo student's correct repair answers: `4x + 20`, `-3x - 6`, `10x - 5`.

A working reference implementation of this whole flow (plain JS) is at
`backend/static/index.html`, served at `http://localhost:8000/`.
