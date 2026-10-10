"""Read-only content: diagnostic questions, the concept graph, teacher totals."""

from collections import Counter

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from .. import ai, config, services
from ..db import get_db
from ..models import Concept, DebtSnapshot, Misconception, Question, StudySession
from ..schemas import ConceptOut, GraphOut, HealthOut, QuestionOut, SessionOut, TeacherOut

router = APIRouter(prefix="/api", tags=["content"])


def question_out(q: Question, concept_name: str) -> QuestionOut:
    return QuestionOut(
        id=q.id, concept_id=q.concept_id, concept_name=concept_name, kind=q.kind, prompt=q.prompt, is_repair=q.is_repair
    )


@router.get("/health", response_model=HealthOut)
def health():
    return HealthOut(
        status="ok",
        ai_enabled=ai.enabled(),
        ai_model=config.AI_MODEL if ai.enabled() else None,
        ai_stats=ai.STATS,
    )


@router.get("/diagnostic", response_model=list[QuestionOut])
def diagnostic(db: Session = Depends(get_db)):
    """The diagnostic test, in order. Answers are not included."""
    names = {c.id: c.name for c in db.exec(select(Concept)).all()}
    questions = db.exec(select(Question).where(Question.is_repair == False).order_by(Question.id)).all()  # noqa: E712
    return [question_out(q, names[q.concept_id]) for q in questions]


@router.get("/concepts", response_model=list[ConceptOut])
def concepts(db: Session = Depends(get_db)):
    graph = services.load_graph(db)
    by_concept: dict[str, list] = {}
    for m in db.exec(select(Misconception)).all():
        by_concept.setdefault(m.concept_id, []).append({"id": m.id, "name": m.name})
    rows = db.exec(select(Concept).order_by(Concept.level, Concept.id)).all()
    return [
        ConceptOut(
            id=c.id, name=c.name, level=c.level, description=c.description,
            prerequisites=graph.nodes[c.id].requires, misconceptions=by_concept.get(c.id, []),
        )
        for c in rows
    ]


@router.get("/graph", response_model=GraphOut)
def graph(session_id: str | None = None, db: Session = Depends(get_db)):
    """Nodes and edges for React Flow / D3. Pass session_id to colour nodes by debt."""
    g = services.load_graph(db)
    descriptions = {c.id: c.description for c in db.exec(select(Concept)).all()}
    debts, root, failed = {}, None, set()
    if session_id:
        services.get_session(db, session_id)
        _, debts, root, _ = services.analyse(db, session_id)
        failed = {t for d in debts.values() for t in d.affected_topics}
    nodes = []
    for cid, node in sorted(g.nodes.items(), key=lambda kv: (kv[1].level, kv[0])):
        debt = debts[cid].debt if debts else 0.0
        nodes.append({
            "id": cid, "name": node.name, "level": node.level, "description": descriptions[cid],
            "debt": round(debt, 1), "status": services.concept_status(cid, debt, root, failed),
        })
    edges = [
        {"id": f"{req}->{cid}", "source": req, "target": cid}
        for cid, node in g.nodes.items()
        for req in node.requires
    ]
    return {"nodes": nodes, "edges": edges}


@router.get("/teacher/overview", response_model=TeacherOut)
def teacher_overview(db: Session = Depends(get_db)):
    """Class-level view from every session's 'before' snapshot."""
    sessions = db.exec(select(StudySession)).all()
    snaps = db.exec(select(DebtSnapshot).where(DebtSnapshot.kind == "before")).all()
    roots = Counter(s.root_concept_id for s in sessions if s.root_concept_id)
    per_concept: dict[str, list[float]] = {}
    for s in snaps:
        per_concept.setdefault(s.concept_id, []).append(s.debt)
    debugged = len({s.session_id for s in snaps})
    names = {c.id: c.name for c in db.exec(select(Concept)).all()}
    rows = [
        {
            "concept_id": cid,
            "name": names[cid],
            "sessions_as_root": roots.get(cid, 0),
            "avg_debt": round(sum(v) / len(v), 1),
            "students_with_debt": sum(1 for x in v if x >= 30),
        }
        for cid, v in per_concept.items()
    ]
    rows = [r for r in rows if r["avg_debt"] >= 1 or r["sessions_as_root"]]
    rows.sort(key=lambda r: (-r["sessions_as_root"], -r["avg_debt"]))
    return {"sessions": len(sessions), "debugged_sessions": debugged, "concepts": rows}


# The scripted demo student from the brief: weak on the distributive property.
DEMO_WRONG = {
    "d05": "3x + 2",
    "d06": "-2x - 6",
    "d08": "-x + 4",
    "d10": "11/3",
    "d11": "3(2x + 9)",
    "d12": "x^2 + 9",
    "d13": "sqrt(7/2)",
}


@router.post("/demo/session", response_model=SessionOut, status_code=201, tags=["demo"])
def demo_session(db: Session = Depends(get_db)):
    """Create a session with the diagnostic already answered by the demo student.
    Handy for building the UI without clicking through the test."""
    from .learning import session_out

    s = StudySession(label="demo")
    db.add(s)
    db.commit()
    db.refresh(s)
    for q in db.exec(select(Question).where(Question.is_repair == False).order_by(Question.id)).all():  # noqa: E712
        services.record_attempt(db, s, q, DEMO_WRONG.get(q.id, q.answer), None, 15000)
    return session_out(db, s)
