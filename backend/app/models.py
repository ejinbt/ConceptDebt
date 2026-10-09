"""Database tables. Concepts, misconceptions and questions are seeded content;
sessions, attempts and snapshots are per-student data."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Concept(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    description: str = ""
    level: int = 0


class Prerequisite(SQLModel, table=True):
    """Directed edge: `concept_id` requires `requires_id`."""

    concept_id: str = Field(foreign_key="concept.id", primary_key=True)
    requires_id: str = Field(foreign_key="concept.id", primary_key=True)


class Misconception(SQLModel, table=True):
    id: str = Field(primary_key=True)
    concept_id: str = Field(foreign_key="concept.id", index=True)
    name: str
    description: str = ""


class Question(SQLModel, table=True):
    id: str = Field(primary_key=True)
    concept_id: str = Field(foreign_key="concept.id", index=True)
    kind: str  # number | expression | factored
    prompt: str
    answer: str
    is_repair: bool = False
    generated: bool = False  # written by the AI layer at runtime
    # [{"answer": "3x + 2", "misconception_id": "partial_distribution"}, ...]
    distractors: list = Field(default_factory=list, sa_column=Column(JSON))


class StudySession(SQLModel, table=True):
    __tablename__ = "study_session"

    id: str = Field(default_factory=lambda: uuid.uuid4().hex, primary_key=True)
    label: Optional[str] = None
    phase: str = "diagnostic"  # diagnostic | debugged | repair | done
    root_concept_id: Optional[str] = Field(default=None, foreign_key="concept.id")
    explanation: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=_now)


class Attempt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="study_session.id", index=True)
    question_id: str = Field(foreign_key="question.id")
    mode: str = "diagnostic"  # diagnostic | repair
    answer: str
    working: Optional[str] = None
    time_ms: Optional[int] = None
    correct: bool
    misconception_id: Optional[str] = Field(default=None, foreign_key="misconception.id")
    confidence: float = 0.0
    source: str = "rule"  # rule | ai | unclassified | correct
    rationale: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)


class DebtSnapshot(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="study_session.id", index=True)
    kind: str  # before | after
    concept_id: str = Field(foreign_key="concept.id")
    debt: float
    evidence_count: int
    taken_at: datetime = Field(default_factory=_now)
