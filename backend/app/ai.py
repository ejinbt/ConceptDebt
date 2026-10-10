"""Optional LLM layer. Every function returns None when the AI is disabled or a
call fails, and callers fall back to deterministic logic, so the app never
depends on it. Outputs are structured (Pydantic) and validated before use."""

import json
import logging
import re
from typing import Literal, Optional

import openai
from pydantic import BaseModel, Field, ValidationError

from . import checker, config

log = logging.getLogger("conceptdebt.ai")

_client: Optional[openai.OpenAI] = None


def enabled() -> bool:
    return bool(config.AI_API_KEY) and not config.AI_DISABLED


def _get_client() -> openai.OpenAI:
    global _client
    if _client is None:
        _client = openai.OpenAI(api_key=config.AI_API_KEY, base_url=config.AI_BASE_URL, timeout=45.0, max_retries=1)
    return _client


def _extract_json(text: str) -> Optional[str]:
    # open models sometimes wrap JSON in prose, code fences or <think> blocks
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S)
    start, end = text.find("{"), text.rfind("}")
    return text[start : end + 1] if start != -1 and end > start else None


# Counters shown in GET /api/health so you can see AI failures without reading logs
STATS: dict = {"calls": 0, "ok": 0, "failed": 0, "last_error": None}


def _fail(message: str) -> None:
    log.warning(message)
    STATS["failed"] += 1
    STATS["last_error"] = message[:300]


def _parse(system: str, prompt: str, schema: type[BaseModel], max_tokens: int = 1500):
    if not enabled():
        return None
    STATS["calls"] += 1
    instructions = (
        f"{system}\n\nReply with a single JSON object and nothing else. "
        f"It must match this JSON schema:\n{json.dumps(schema.model_json_schema())}"
    )
    try:
        response = _get_client().chat.completions.create(
            model=config.AI_MODEL,
            messages=[{"role": "system", "content": instructions}, {"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.2,
        )
    except openai.APIConnectionError as e:
        return _fail(f"AI connection error: {e}")
    except openai.RateLimitError as e:
        return _fail(f"AI rate limited (too many requests at once for your plan): {e}")
    except openai.APIStatusError as e:
        return _fail(f"AI request failed ({e.status_code}): {e.message}")

    content = (response.choices[0].message.content or "") if response.choices else ""
    raw = _extract_json(content)
    if raw is None:
        return _fail(f"AI reply had no JSON: {content[:200]}")
    try:
        result = schema.model_validate_json(raw)
    except ValidationError as e:
        return _fail(f"AI reply failed validation: {e}")
    STATS["ok"] += 1
    return result


# --- mistake interpretation -------------------------------------------------


class Classification(BaseModel):
    misconception_id: str = Field(description="One id from the list, or 'none'")
    confidence: float = Field(description="0 to 1")
    rationale: str = Field(description="One sentence, addressed to a teacher")


def classify_mistake(
    question_prompt: str,
    correct_answer: str,
    student_answer: str,
    working: Optional[str],
    candidates: list[dict],
) -> Optional[tuple[Optional[str], float, str]]:
    """Pick the most likely misconception from a fixed list. Returns
    (misconception_id or None, confidence, rationale) or None if unavailable."""
    if not candidates:
        return None
    options = "\n".join(f"- {c['id']}: {c['name']}. {c['description']}" for c in candidates)
    result = _parse(
        system=(
            "You diagnose maths mistakes. Choose the single misconception that best explains "
            "the student's wrong answer, using only the ids provided. Answer 'none' if no "
            "listed misconception fits. Be conservative with confidence: a guess from the "
            "answer alone should stay below 0.6; clear evidence in the working can go higher."
        ),
        prompt=(
            f"Question: {question_prompt}\nCorrect answer: {correct_answer}\n"
            f"Student answer: {student_answer}\nStudent working: {working or '(none given)'}\n\n"
            f"Misconceptions:\n{options}"
        ),
        schema=Classification,
        max_tokens=1000,
    )
    if result is None:
        return None
    ids = {c["id"] for c in candidates}
    misconception = result.misconception_id if result.misconception_id in ids else None
    # rule-matched answers carry 0.9; the model never outranks a known wrong answer
    confidence = max(0.0, min(0.85, float(result.confidence))) if misconception else 0.0
    return misconception, confidence, result.rationale.strip()


# --- natural-language feedback ----------------------------------------------


class Explanation(BaseModel):
    summary: str = Field(description="Two or three sentences on what is going wrong and why it spreads")
    advice: str = Field(description="One sentence on what to practise next")


def explain(evidence: dict) -> Optional[dict]:
    result = _parse(
        system=(
            "You write feedback for a student who just took a maths diagnostic. Explain the root "
            "cause behind their mistakes in plain language, citing the evidence (counts and "
            "topics). No lecture, no praise padding, no claims about ability. Address the student as 'you'."
        ),
        prompt=f"Evidence (JSON):\n{evidence}",
        schema=Explanation,
        max_tokens=1500,
    )
    if result is None:
        return None
    return {"summary": result.summary.strip(), "advice": result.advice.strip(), "source": "ai"}


# --- question generation ----------------------------------------------------


class GeneratedDistractor(BaseModel):
    answer: str
    misconception_id: str


class GeneratedQuestion(BaseModel):
    prompt: str = Field(description="Short question, e.g. 'Expand 4(x - 3)'")
    answer: str = Field(description="Plain-text maths, e.g. '4x - 12'. Use ^ for powers.")
    kind: Literal["number", "expression"]
    distractors: list[GeneratedDistractor]


class GeneratedSet(BaseModel):
    questions: list[GeneratedQuestion]


def generate_repair_questions(concept: dict, misconceptions: list[dict], count: int) -> Optional[list[dict]]:
    options = "\n".join(f"- {m['id']}: {m['name']}. {m['description']}" for m in misconceptions)
    result = _parse(
        system=(
            "You write short practice questions that target one maths concept. Each question "
            "must have a single exact answer in plain text (use ^ for powers, / for fractions). "
            "For each question, give the wrong answer each listed misconception would produce."
        ),
        prompt=(
            f"Concept: {concept['name']}. {concept['description']}\n"
            f"Misconceptions to target:\n{options or '(none listed)'}\n\n"
            f"Write {count} questions, easiest first."
        ),
        schema=GeneratedSet,
        max_tokens=3000,
    )
    if result is None:
        return None
    ids = {m["id"] for m in misconceptions}
    valid = []
    for q in result.questions:
        if not checker.is_parseable(q.answer):
            continue
        distractors = [
            {"answer": d.answer, "misconception_id": d.misconception_id}
            for d in q.distractors
            if d.misconception_id in ids and checker.is_parseable(d.answer)
            and not checker.equivalent(d.answer, q.answer, q.kind)
        ]
        valid.append({"prompt": q.prompt, "answer": q.answer, "kind": q.kind, "distractors": distractors})
    return valid[:count] or None
