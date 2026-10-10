"""The student flow: session -> diagnostic attempts -> debug -> repair -> reverify."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from .. import services
from ..db import get_db
from ..models import Concept, Misconception, Question, StudySession
from ..schemas import (
    AnalysisOut,
    AttemptIn,
    AttemptOut,
    RepairOut,
    ReverifyOut,
    ScoreOut,
    SessionCreate,
    SessionOut,
)
from .content import question_out

router = APIRouter(prefix="/api", tags=["learning"])


def session_out(db: Session, s: StudySession) -> SessionOut:
    return SessionOut(
        session_id=s.id,
        label=s.label,
        grade=s.grade,
        phase=s.phase,
        root_concept_id=s.root_concept_id,
        answered=len(services.session_attempts(db, s.id)),
        created_at=s.created_at,
    )


@router.post("/sessions", response_model=SessionOut, status_code=201)
def create_session(body: SessionCreate | None = None, db: Session = Depends(get_db)):
    s = StudySession(label=body.label if body else None, grade=body.grade if body else services.DEFAULT_GRADE)
    db.add(s)
    db.commit()
    db.refresh(s)
    return session_out(db, s)


@router.get("/sessions/{session_id}", response_model=SessionOut)
def read_session(session_id: str, db: Session = Depends(get_db)):
    return session_out(db, services.get_session(db, session_id))


@router.post("/attempts", response_model=AttemptOut, status_code=201)
def submit_attempt(body: AttemptIn, db: Session = Depends(get_db)):
    session = services.get_session(db, body.session_id)
    question = db.get(Question, body.question_id)
    if question is None:
        raise HTTPException(404, f"question {body.question_id} not found")
    if not body.not_learned and not body.answer.strip():
        raise HTTPException(422, "answer is empty")

    a = services.record_attempt(db, session, question, body.answer, body.working, body.time_ms, body.not_learned)
    misconception = db.get(Misconception, a.misconception_id) if a.misconception_id else None
    return AttemptOut(
        attempt_id=a.id,
        question_id=a.question_id,
        mode=a.mode,
        answer=a.answer,
        working=a.working,
        correct=a.correct,
        correct_answer=question.answer,
        misconception={"id": misconception.id, "name": misconception.name} if misconception else None,
        confidence=round(a.confidence, 2),
        source=a.source,
        rationale=a.rationale,
    )


@router.get("/sessions/{session_id}/attempts", response_model=list[AttemptOut])
def list_attempts(session_id: str, db: Session = Depends(get_db)):
    services.get_session(db, session_id)
    questions = {q.id: q for q in db.exec(select(Question)).all()}
    names = {m.id: m.name for m in db.exec(select(Misconception)).all()}
    return [
        AttemptOut(
            attempt_id=a.id,
            question_id=a.question_id,
            mode=a.mode,
            answer=a.answer,
            working=a.working,
            correct=a.correct,
            correct_answer=questions[a.question_id].answer,
            misconception={"id": a.misconception_id, "name": names[a.misconception_id]} if a.misconception_id else None,
            confidence=round(a.confidence, 2),
            source=a.source,
            rationale=a.rationale,
        )
        for a in services.session_attempts(db, session_id)
    ]


@router.get("/sessions/{session_id}/score", response_model=ScoreOut)
def plain_score(session_id: str, db: Session = Depends(get_db)):
    """The 'symptom' view: a normal percentage score on the diagnostic."""
    session = services.get_session(db, session_id)
    latest = {
        a.question_id: a for a in services.session_attempts(db, session_id)
        if a.mode == "diagnostic" and a.source not in services.IGNORED_SOURCES
    }
    total = len(services.diagnostic_questions(db, session.grade))
    correct = sum(a.correct for a in latest.values())
    return ScoreOut(
        session_id=session_id,
        answered=len(latest),
        correct=correct,
        total_questions=total,
        percent=round(100 * correct / len(latest), 1) if latest else 0.0,
    )


@router.post("/sessions/{session_id}/debug", response_model=AnalysisOut)
def debug_learning(session_id: str, db: Session = Depends(get_db)):
    """Run the debt engine, pick the root cause and save a 'before' snapshot."""
    session = services.get_session(db, session_id)
    services.save_snapshot(db, session_id, "before")
    analysis = services.build_analysis(db, session, use_ai=True)
    session.root_concept_id = analysis["root"]["concept_id"] if analysis["root"] else None
    session.explanation = analysis["explanation"]
    session.phase = "debugged"
    db.add(session)
    db.commit()
    analysis["phase"] = session.phase
    return analysis


@router.get("/sessions/{session_id}/debt", response_model=AnalysisOut)
def current_debt(session_id: str, db: Session = Depends(get_db)):
    """Live debt without saving anything. Explanation is template-only (fast)."""
    return services.build_analysis(db, services.get_session(db, session_id), use_ai=False)


@router.post("/sessions/{session_id}/repair", response_model=RepairOut)
def start_repair(session_id: str, count: int = Query(3, ge=1, le=5), db: Session = Depends(get_db)):
    session = services.get_session(db, session_id)
    if not session.root_concept_id:
        raise HTTPException(409, "no root cause yet: call POST /debug first")
    questions = services.repair_questions(db, session, count)
    session.phase = "repair"
    db.add(session)
    db.commit()
    concept = db.get(Concept, session.root_concept_id)
    _, debts, _, _ = services.analyse(db, session_id)
    return RepairOut(
        session_id=session_id,
        root={"concept_id": concept.id, "name": concept.name, "debt": round(debts[concept.id].debt, 1)},
        questions=[question_out(q, concept) for q in questions],
    )


@router.post("/sessions/{session_id}/reverify", response_model=ReverifyOut)
def reverify(session_id: str, db: Session = Depends(get_db)):
    """Recompute debt after repair and compare with the 'before' snapshot."""
    session = services.get_session(db, session_id)
    before = services.snapshot(db, session_id, "before")
    if not before:
        raise HTTPException(409, "no 'before' snapshot: call POST /debug first")
    root_id = session.root_concept_id
    services.save_snapshot(db, session_id, "after")
    after = services.snapshot(db, session_id, "after")
    session.phase = "done"
    db.add(session)
    db.commit()

    names = {c.id: c.name for c in db.exec(select(Concept)).all()}
    changes = [
        {"concept_id": cid, "name": names[cid], "before": before.get(cid, 0.0), "after": after.get(cid, 0.0),
         "change": round(after.get(cid, 0.0) - before.get(cid, 0.0), 1)}
        for cid in names
        if before.get(cid, 0.0) >= 1 or after.get(cid, 0.0) >= 1
    ]
    changes.sort(key=lambda c: c["change"])
    repair = [a for a in services.session_attempts(db, session_id) if a.mode == "repair" and a.source not in services.IGNORED_SOURCES]
    return ReverifyOut(
        session_id=session_id,
        root_concept_id=root_id,
        root_before=before.get(root_id, 0.0) if root_id else 0.0,
        root_after=after.get(root_id, 0.0) if root_id else 0.0,
        changes=changes,
        repair_answered=len(repair),
        repair_correct=sum(a.correct for a in repair),
        analysis=services.build_analysis(db, session, use_ai=False),
    )
