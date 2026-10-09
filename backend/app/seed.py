"""Load the curated concept graph and question bank into the database.

    python -m app.seed           # load if the database is empty
    python -m app.seed --reset   # drop everything and reload
"""

import json
import sys

from sqlmodel import Session, SQLModel, select

from . import config
from .db import engine, init_db
from .models import Concept, Misconception, Prerequisite, Question


def _load(name: str):
    return json.loads((config.SEED_DIR / name).read_text(encoding="utf-8"))


def seed(db: Session) -> bool:
    if db.exec(select(Concept)).first():
        return False

    concepts = _load("concepts.json")
    for c in concepts:
        db.add(Concept(id=c["id"], name=c["name"], description=c["description"], level=c["level"]))
    db.flush()
    for c in concepts:
        for req in c["prerequisites"]:
            db.add(Prerequisite(concept_id=c["id"], requires_id=req))

    for m in _load("misconceptions.json"):
        db.add(Misconception(**m))
    db.flush()

    bank = _load("questions.json")
    for group, is_repair in (("diagnostic", False), ("repair", True)):
        for q in bank[group]:
            db.add(Question(is_repair=is_repair, **q))

    db.commit()
    return True


def main() -> None:
    if "--reset" in sys.argv:
        from . import models  # noqa: F401

        SQLModel.metadata.drop_all(engine)
    init_db()
    with Session(engine) as db:
        print("seeded" if seed(db) else "already seeded")


if __name__ == "__main__":
    main()
