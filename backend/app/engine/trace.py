"""Root-cause search: which concept best explains the set of failed topics?"""

from dataclasses import dataclass
from typing import Optional

from .graph import ConceptGraph
from .scoring import ConceptDebt

MIN_ROOT_DEBT = 10.0


@dataclass
class RootCause:
    concept_id: str
    coverage: float  # share of failed topics this concept explains
    symptom: str  # the most advanced failed topic it explains
    path: list[str]  # symptom -> ... -> root


def failed_topics(debts: dict[str, ConceptDebt]) -> set[str]:
    topics: set[str] = set()
    for d in debts.values():
        topics |= d.affected_topics
    return topics


def find_root(graph: ConceptGraph, debts: dict[str, ConceptDebt]) -> Optional[RootCause]:
    failed = failed_topics(debts)
    if not failed:
        return None

    best: Optional[tuple[float, int, str]] = None
    for cid, d in debts.items():
        if d.debt < MIN_ROOT_DEBT or d.mistakes == 0:
            continue
        coverage = len(d.affected_topics & failed) / len(failed)
        score = d.debt * coverage
        # prefer the more foundational concept on ties
        key = (score, -graph.nodes[cid].level, cid)
        if best is None or key > best:
            best = key
    if best is None:
        return None

    root_id = best[2]
    root = debts[root_id]
    candidates = [t for t in root.affected_topics if t == root_id or t in graph.descendants(root_id)]
    symptom = max(candidates, key=lambda t: (graph.nodes[t].level, t)) if candidates else root_id
    return RootCause(
        concept_id=root_id,
        coverage=len(root.affected_topics & failed) / len(failed),
        symptom=symptom,
        path=graph.path(symptom, root_id) or [root_id],
    )
