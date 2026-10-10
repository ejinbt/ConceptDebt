"""Glue between the database, the deterministic engine and the AI layer."""

import uuid
from collections import Counter
from typing import Optional

from fastapi import HTTPException
from sqlmodel import Session, select

from . import ai, checker
from .engine.graph import ConceptGraph, ConceptNode
from .engine.scoring import AttemptEvidence, ConceptDebt, compute_debt
from .engine.trace import RootCause, find_root
from .models import Attempt, Concept, DebtSnapshot, Misconception, Prerequisite, Question, StudySession

RULE_CONFIDENCE = 0.9
UNCLASSIFIED_CONFIDENCE = 0.3


# --- loading -----------------------------------------------------------------


def load_graph(db: Session) -> ConceptGraph:
    concepts = db.exec(select(Concept)).all()
    requires: dict[str, list[str]] = {c.id: [] for c in concepts}
    for edge in db.exec(select(Prerequisite)).all():
        requires[edge.concept_id].append(edge.requires_id)
    return ConceptGraph([ConceptNode(c.id, c.name, c.level, sorted(requires[c.id])) for c in concepts])


def get_session(db: Session, session_id: str) -> StudySession:
    s = db.get(StudySession, session_id)
    if s is None:
        raise HTTPException(404, f"session {session_id} not found")
    return s


def session_attempts(db: Session, session_id: str) -> list[Attempt]:
    return list(db.exec(select(Attempt).where(Attempt.session_id == session_id).order_by(Attempt.id)).all())


# --- answering ---------------------------------------------------------------


def record_attempt(
    db: Session,
    session: StudySession,
    question: Question,
    answer: str,
    working: Optional[str],
    time_ms: Optional[int],
) -> Attempt:
    correct = checker.check(question.kind, question.answer, answer)
    misconception_id, confidence, source, rationale = None, 0.0, "correct", None

    if not correct and not checker.is_valid_answer(question.kind, answer, question.answer, question.prompt):
        # gibberish is not evidence of a misconception: store it, but scoring ignores it
        source, rationale = "invalid", "This doesn't look like a maths answer for this question."
    elif not correct:
        misconception_id = checker.match_distractor(question.kind, question.distractors, answer)
        if misconception_id:
            confidence, source = RULE_CONFIDENCE, "rule"
            rationale = "Answer matches a known wrong answer for this question."
        else:
            result = ai.classify_mistake(
                question.prompt, question.answer, answer, working, candidate_misconceptions(db, question.concept_id)
            )
            if result and result[0]:
                misconception_id, confidence, rationale = result
                source = "ai"
            else:
                confidence, source = UNCLASSIFIED_CONFIDENCE, "unclassified"
                rationale = result[2] if result else None

    # one answer per question: re-answering (e.g. after going back) replaces the
    # earlier attempt, so the same question never counts as evidence twice
    for old in db.exec(
        select(Attempt).where(Attempt.session_id == session.id, Attempt.question_id == question.id)
    ).all():
        db.delete(old)

    attempt = Attempt(
        session_id=session.id,
        question_id=question.id,
        mode="repair" if question.is_repair else "diagnostic",
        answer=answer,
        working=working,
        time_ms=time_ms,
        correct=correct,
        misconception_id=misconception_id,
        confidence=confidence,
        source=source,
        rationale=rationale,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def candidate_misconceptions(db: Session, concept_id: str) -> list[dict]:
    """Misconceptions on the question's concept or any of its prerequisites."""
    graph = load_graph(db)
    scope = {concept_id, *graph.ancestors(concept_id)}
    rows = db.exec(select(Misconception).where(Misconception.concept_id.in_(scope))).all()
    return [{"id": m.id, "name": m.name, "description": m.description} for m in rows]


# --- analysis ----------------------------------------------------------------


def analyse(db: Session, session_id: str) -> tuple[ConceptGraph, dict[str, ConceptDebt], Optional[RootCause], list[Attempt]]:
    graph = load_graph(db)
    attempts = [a for a in session_attempts(db, session_id) if a.source != "invalid"]
    questions = {q.id: q for q in db.exec(select(Question)).all()}
    mis_concept = {m.id: m.concept_id for m in db.exec(select(Misconception)).all()}
    evidence = [
        AttemptEvidence(
            question_concept=questions[a.question_id].concept_id,
            correct=a.correct,
            confidence=a.confidence,
            misconception_id=a.misconception_id,
            misconception_concept=mis_concept.get(a.misconception_id) if a.misconception_id else None,
        )
        for a in attempts
    ]
    debts = compute_debt(graph, evidence)
    return graph, debts, find_root(graph, debts), attempts


def concept_status(cid: str, debt: float, root: Optional[RootCause], failed: set[str]) -> str:
    if root and cid == root.concept_id:
        return "root"
    if root and cid in root.path:
        return "trace"
    if cid in failed:
        return "failed"
    if debt >= 10:
        return "at_risk"
    return "ok"


def debt_rows(db: Session, graph: ConceptGraph, debts: dict[str, ConceptDebt], root: Optional[RootCause], min_debt: float = 1.0) -> list[dict]:
    names = {m.id: m.name for m in db.exec(select(Misconception)).all()}
    failed = {t for d in debts.values() for t in d.affected_topics}
    rows = []
    for cid, d in debts.items():
        if d.debt < min_debt:
            continue
        node = graph.nodes[cid]
        rows.append({
            "concept_id": cid,
            "name": node.name,
            "level": node.level,
            "debt": round(d.debt, 1),
            "mistakes": d.mistakes,
            "evidence_count": d.evidence_count,
            "confidence": round(d.confidence, 2),
            "affected_topics": sorted(t for t in d.affected_topics if t != cid),
            "misconceptions": [{"id": m, "name": names.get(m, m), "count": n} for m, n in sorted(d.misconceptions.items(), key=lambda x: -x[1])],
            "status": concept_status(cid, d.debt, root, failed),
        })
    rows.sort(key=lambda r: -r["debt"])
    return rows


def evidence_summary(graph: ConceptGraph, debts: dict[str, ConceptDebt], root: Optional[RootCause], attempts: list[Attempt], db: Session) -> dict:
    wrong = [a for a in attempts if not a.correct]
    names = {m.id: m.name for m in db.exec(select(Misconception)).all()}
    counts = Counter(names.get(a.misconception_id, "unclassified") for a in wrong)
    summary = {
        "answered": len(attempts),
        "wrong": len(wrong),
        "misconception_counts": dict(counts),
    }
    if root:
        d = debts[root.concept_id]
        summary["root"] = {
            "concept": graph.nodes[root.concept_id].name,
            "debt_percent": round(d.debt),
            "mistakes_traced_to_it": d.mistakes,
            "affected_topics": [graph.nodes[t].name for t in sorted(d.affected_topics) if t != root.concept_id],
            "trace": [graph.nodes[c].name for c in root.path],
        }
    return summary


def template_explanation(summary: dict) -> dict:
    root = summary.get("root")
    if not root:
        if summary["wrong"] == 0:
            return {"summary": "No mistakes to trace yet.", "advice": "Keep going.", "source": "template"}
        return {
            "summary": f"You missed {summary['wrong']} questions, but they don't share one clear root cause yet.",
            "advice": "Answer a few more questions so the pattern becomes clearer.",
            "source": "template",
        }
    topics = ", ".join(root["affected_topics"]) or "this topic"
    return {
        "summary": (
            f"{root['mistakes_traced_to_it']} of your {summary['wrong']} mistakes trace back to "
            f"{root['concept']}. Because later topics build on it, it is also breaking {topics}."
        ),
        "advice": f"Practise {root['concept']} on its own before going back to the harder topics.",
        "source": "template",
    }


def build_analysis(db: Session, session: StudySession, use_ai: bool) -> dict:
    graph, debts, root, attempts = analyse(db, session.id)
    summary = evidence_summary(graph, debts, root, attempts, db)
    explanation = (ai.explain(summary) if use_ai else None) or template_explanation(summary)
    root_out = None
    if root:
        d = debts[root.concept_id]
        names = {m.id: m.name for m in db.exec(select(Misconception)).all()}
        root_out = {
            "concept_id": root.concept_id,
            "name": graph.nodes[root.concept_id].name,
            "debt": round(d.debt, 1),
            "confidence": round(d.confidence, 2),
            "coverage": round(root.coverage, 2),
            "mistakes": d.mistakes,
            "affected_topics": sorted(t for t in d.affected_topics if t != root.concept_id),
            "misconceptions": [{"id": m, "name": names.get(m, m), "count": n} for m, n in d.misconceptions.items()],
        }
    return {
        "session_id": session.id,
        "phase": session.phase,
        "answered": len(attempts),
        "wrong": summary["wrong"],
        "root": root_out,
        "trace": [{"concept_id": c, "name": graph.nodes[c].name, "debt": round(debts[c].debt, 1)} for c in (root.path if root else [])],
        "concepts": debt_rows(db, graph, debts, root),
        "explanation": explanation,
    }


def save_snapshot(db: Session, session_id: str, kind: str) -> None:
    _, debts, _, _ = analyse(db, session_id)
    for old in db.exec(select(DebtSnapshot).where(DebtSnapshot.session_id == session_id, DebtSnapshot.kind == kind)).all():
        db.delete(old)
    for cid, d in debts.items():
        db.add(DebtSnapshot(session_id=session_id, kind=kind, concept_id=cid, debt=round(d.debt, 1), evidence_count=d.evidence_count))
    db.commit()


def snapshot(db: Session, session_id: str, kind: str) -> dict[str, float]:
    rows = db.exec(select(DebtSnapshot).where(DebtSnapshot.session_id == session_id, DebtSnapshot.kind == kind)).all()
    return {r.concept_id: r.debt for r in rows}


# --- repair ------------------------------------------------------------------


def repair_questions(db: Session, session: StudySession, count: int) -> list[Question]:
    concept_id = session.root_concept_id
    answered = {a.question_id for a in session_attempts(db, session.id)}
    pool = db.exec(
        select(Question).where(Question.concept_id == concept_id, Question.is_repair == True)  # noqa: E712
    ).all()
    fresh = [q for q in pool if q.id not in answered]
    if len(fresh) >= count:
        return fresh[:count]

    concept = db.get(Concept, concept_id)
    misconceptions = [
        {"id": m.id, "name": m.name, "description": m.description}
        for m in db.exec(select(Misconception).where(Misconception.concept_id == concept_id)).all()
    ]
    generated = ai.generate_repair_questions(
        {"name": concept.name, "description": concept.description}, misconceptions, count - len(fresh)
    )
    for g in generated or []:
        q = Question(
            id=f"gen-{uuid.uuid4().hex[:10]}",
            concept_id=concept_id,
            is_repair=True,
            generated=True,
            **g,
        )
        db.add(q)
        fresh.append(q)
    if generated:
        db.commit()

    if len(fresh) < count:
        # last resort: reuse the concept's repair or diagnostic questions
        extra = db.exec(select(Question).where(Question.concept_id == concept_id)).all()
        fresh.extend(q for q in extra if q not in fresh)
    return fresh[:count]
