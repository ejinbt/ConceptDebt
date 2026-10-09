"""Concept Debt scoring.

Debt = mistake frequency x recency x prerequisite impact x confidence, made concrete:

* Every wrong attempt is an evidence point with weight w = confidence x RECENCY^age,
  where age is the number of attempts made after it.
* The weight lands on the *blamed* concept: the misconception's concept when one was
  detected, otherwise the question's own concept.
* The question's concept (the symptom) and anything on the chain between it and the
  blamed concept get a SYMPTOM_SHARE of w, so the trace lights up in the graph.
* Prerequisites of the blamed concept get a decaying share per hop, because the
  real cause may sit even further down.
* Correct answers pay debt down: full credit on the question's concept, a smaller
  share on its prerequisites (answering it implies they held up).
* raw = evidence - credit;  debt% = 100 x (1 - e^(-raw x impact / K)),
  where impact grows with the number of concepts that depend on this one.

All constants are deliberately simple and tunable. The score is a prioritisation
signal, not a measure of mastery.
"""

import math
from dataclasses import dataclass, field
from typing import Optional

from .graph import ConceptGraph

RECENCY = 0.95
SYMPTOM_SHARE = 0.35
HOP_CLASSIFIED = 0.25  # propagation per hop when a misconception was identified
HOP_UNCLASSIFIED = 0.5  # propagation per hop when we only know the answer was wrong
CREDIT_DIRECT = 1.15
CREDIT_HOP = 0.3
K = 4.5


@dataclass
class AttemptEvidence:
    question_concept: str
    correct: bool
    confidence: float = 0.0
    misconception_id: Optional[str] = None
    misconception_concept: Optional[str] = None


@dataclass
class ConceptDebt:
    concept_id: str
    raw: float = 0.0
    evidence: float = 0.0
    credit: float = 0.0
    debt: float = 0.0
    mistakes: int = 0  # wrong attempts blamed directly on this concept
    evidence_count: int = 0  # wrong attempts that touched this concept at all
    confidence: float = 0.0
    affected_topics: set[str] = field(default_factory=set)  # failed question concepts it explains
    misconceptions: dict[str, int] = field(default_factory=dict)
    _conf_sum: float = 0.0


def impact(graph: ConceptGraph, concept_id: str) -> float:
    max_desc = max((len(graph.descendants(c)) for c in graph.nodes), default=0)
    if max_desc == 0:
        return 1.0
    return 1.0 + math.log1p(len(graph.descendants(concept_id))) / math.log1p(max_desc)


def compute_debt(graph: ConceptGraph, attempts: list[AttemptEvidence]) -> dict[str, ConceptDebt]:
    """Score every concept from an ordered list of attempts (oldest first)."""
    debts = {cid: ConceptDebt(cid) for cid in graph.nodes}
    n = len(attempts)

    for i, a in enumerate(attempts):
        recency = RECENCY ** (n - 1 - i)

        if a.correct:
            debts[a.question_concept].credit += CREDIT_DIRECT * recency
            for anc, hops in graph.ancestors(a.question_concept).items():
                debts[anc].credit += CREDIT_DIRECT * recency * CREDIT_HOP**hops
            continue

        w = a.confidence * recency
        blamed = a.misconception_concept or a.question_concept
        hop_factor = HOP_CLASSIFIED if a.misconception_concept else HOP_UNCLASSIFIED

        touched: dict[str, float] = {blamed: w}
        if a.question_concept != blamed:
            for cid in [a.question_concept, *graph.between(a.question_concept, blamed)]:
                touched[cid] = max(touched.get(cid, 0.0), w * SYMPTOM_SHARE)
        for anc, hops in graph.ancestors(blamed).items():
            touched[anc] = max(touched.get(anc, 0.0), w * hop_factor**hops)

        for cid, amount in touched.items():
            d = debts[cid]
            d.evidence += amount
            d.evidence_count += 1
            d.affected_topics.add(a.question_concept)

        d = debts[blamed]
        d.mistakes += 1
        d._conf_sum += a.confidence
        if a.misconception_id:
            d.misconceptions[a.misconception_id] = d.misconceptions.get(a.misconception_id, 0) + 1

    for cid, d in debts.items():
        d.raw = max(0.0, d.evidence - d.credit)
        d.debt = 100.0 * (1.0 - math.exp(-d.raw * impact(graph, cid) / K))
        if d.mistakes:
            # repeated evidence beats a single answer: full confidence needs 3+ mistakes
            d.confidence = (d._conf_sum / d.mistakes) * min(1.0, d.mistakes / 3)
        elif d.evidence_count:
            d.confidence = 0.3
    return debts
