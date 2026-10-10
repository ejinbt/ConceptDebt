"""Load the curated concept graph and question bank into the database.

Runs on every start and updates content in place (insert or update by id), so
editing the JSON files and redeploying is enough. Student data is kept.

    python -m app.seed           # sync content
    python -m app.seed --reset   # drop everything (incl. sessions) and reload
"""

import json
import sys

from sqlmodel import Session, SQLModel, delete, select

from . import config
from .db import engine, init_db
from .models import Attempt, Concept, Misconception, Prerequisite, Question


def _load(name: str):
    return json.loads((config.SEED_DIR / name).read_text(encoding="utf-8"))


def seed(db: Session) -> None:
    concepts = _load("concepts.json")
    concept_ids = {c["id"] for c in concepts}
    for c in concepts:
        db.merge(Concept(id=c["id"], name=c["name"], description=c["description"],
                         level=c["grade"] - 6, grade=c["grade"], ncert=c["ncert"]))
    db.flush()

    db.exec(delete(Prerequisite))
    for c in concepts:
        for req in c["prerequisites"]:
            db.add(Prerequisite(concept_id=c["id"], requires_id=req))

    misconceptions = _load("misconceptions.json")
    for m in misconceptions:
        db.merge(Misconception(**m))
    db.flush()

    bank = _load("questions.json")
    for group, is_repair in (("diagnostic", False), ("repair", True)):
        for q in bank[group]:
            db.merge(Question(is_repair=is_repair, **{"grade": None, **q}))
    db.flush()

    # drop concepts that left the curriculum, unless student data still points at them
    answered = set(db.exec(select(Attempt.question_id)).all())
    for c in db.exec(select(Concept).where(Concept.id.not_in(concept_ids))).all():
        questions = db.exec(select(Question).where(Question.concept_id == c.id)).all()
        if any(q.id in answered for q in questions):
            continue
        for q in questions:
            db.delete(q)
        for m in db.exec(select(Misconception).where(Misconception.concept_id == c.id)).all():
            db.delete(m)
        db.delete(c)
    db.commit()


def main() -> None:
    if "--reset" in sys.argv:
        from . import models  # noqa: F401

        SQLModel.metadata.drop_all(engine)
    init_db()
    with Session(engine) as db:
        seed(db)
    print("seeded")


if __name__ == "__main__":
    main()
