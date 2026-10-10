"""Request and response shapes. These drive the OpenAPI docs at /docs."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

Phase = Literal["diagnostic", "debugged", "repair", "done"]
Status = Literal["root", "trace", "failed", "at_risk", "ok"]


class SessionCreate(BaseModel):
    label: Optional[str] = Field(None, max_length=80, description="Optional nickname. Don't send personal data.")


class SessionOut(BaseModel):
    session_id: str
    label: Optional[str]
    phase: Phase
    root_concept_id: Optional[str]
    answered: int
    created_at: datetime


class QuestionOut(BaseModel):
    id: str
    concept_id: str
    concept_name: str
    kind: Literal["number", "expression", "factored"]
    prompt: str
    is_repair: bool


class AttemptIn(BaseModel):
    session_id: str
    question_id: str
    answer: str = Field(..., max_length=200)
    working: Optional[str] = Field(None, max_length=2000, description="Optional working or explanation")
    time_ms: Optional[int] = Field(None, ge=0)


class MisconceptionRef(BaseModel):
    id: str
    name: str


class AttemptOut(BaseModel):
    attempt_id: int
    question_id: str
    mode: Literal["diagnostic", "repair"]
    answer: str
    working: Optional[str]
    correct: bool
    correct_answer: str
    misconception: Optional[MisconceptionRef]
    confidence: float
    source: Literal["rule", "ai", "unclassified", "correct"]
    rationale: Optional[str]


class ScoreOut(BaseModel):
    session_id: str
    answered: int
    correct: int
    total_questions: int
    percent: float


class MisconceptionCount(BaseModel):
    id: str
    name: str
    count: int


class ConceptDebtOut(BaseModel):
    concept_id: str
    name: str
    level: int
    debt: float = Field(description="0-100")
    mistakes: int = Field(description="Wrong answers blamed directly on this concept")
    evidence_count: int = Field(description="Wrong answers that touched this concept at all")
    confidence: float
    affected_topics: list[str]
    misconceptions: list[MisconceptionCount]
    status: Status


class RootOut(BaseModel):
    concept_id: str
    name: str
    debt: float
    confidence: float
    coverage: float = Field(description="Share of failed topics this root explains, 0-1")
    mistakes: int
    affected_topics: list[str]
    misconceptions: list[MisconceptionCount]


class TraceStep(BaseModel):
    concept_id: str
    name: str
    debt: float


class ExplanationOut(BaseModel):
    summary: str
    advice: str
    source: Literal["ai", "template"]


class AnalysisOut(BaseModel):
    session_id: str
    phase: Phase
    answered: int
    wrong: int
    root: Optional[RootOut]
    trace: list[TraceStep] = Field(description="From the most advanced failed topic down to the root")
    concepts: list[ConceptDebtOut] = Field(description="Concepts with debt >= 1, highest first")
    explanation: ExplanationOut


class RepairOut(BaseModel):
    session_id: str
    root: TraceStep
    questions: list[QuestionOut]


class DebtChange(BaseModel):
    concept_id: str
    name: str
    before: float
    after: float
    change: float


class ReverifyOut(BaseModel):
    session_id: str
    root_concept_id: Optional[str]
    root_before: float
    root_after: float
    changes: list[DebtChange]
    repair_answered: int
    repair_correct: int
    analysis: AnalysisOut


class GraphNode(BaseModel):
    id: str
    name: str
    level: int
    description: str
    debt: float
    status: Status


class GraphEdge(BaseModel):
    id: str
    source: str = Field(description="The prerequisite")
    target: str = Field(description="The concept that depends on it")


class GraphOut(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class ConceptOut(BaseModel):
    id: str
    name: str
    level: int
    description: str
    prerequisites: list[str]
    misconceptions: list[MisconceptionRef]


class TeacherConcept(BaseModel):
    concept_id: str
    name: str
    sessions_as_root: int
    avg_debt: float
    students_with_debt: int


class TeacherOut(BaseModel):
    sessions: int
    debugged_sessions: int
    concepts: list[TeacherConcept]


class HealthOut(BaseModel):
    status: str
    ai_enabled: bool
    ai_model: Optional[str]
