"""The prerequisite graph. Edges point from a concept to what it requires."""

from collections import deque
from dataclasses import dataclass, field


@dataclass
class ConceptNode:
    id: str
    name: str
    level: int
    requires: list[str] = field(default_factory=list)


class ConceptGraph:
    def __init__(self, nodes: list[ConceptNode]):
        self.nodes = {n.id: n for n in nodes}
        self.dependents: dict[str, list[str]] = {n.id: [] for n in nodes}
        for n in nodes:
            for req in n.requires:
                self.dependents.setdefault(req, []).append(n.id)
        self._desc_cache: dict[str, set[str]] = {}

    def ancestors(self, concept_id: str) -> dict[str, int]:
        """Prerequisites of a concept (transitively), with their distance in hops."""
        hops: dict[str, int] = {}
        queue = deque([(concept_id, 0)])
        while queue:
            cid, d = queue.popleft()
            for req in self.nodes[cid].requires:
                if req not in hops:
                    hops[req] = d + 1
                    queue.append((req, d + 1))
        return hops

    def descendants(self, concept_id: str) -> set[str]:
        """Every concept that depends on this one, directly or indirectly."""
        if concept_id not in self._desc_cache:
            seen: set[str] = set()
            stack = list(self.dependents.get(concept_id, []))
            while stack:
                cid = stack.pop()
                if cid not in seen:
                    seen.add(cid)
                    stack.extend(self.dependents.get(cid, []))
            self._desc_cache[concept_id] = seen
        return self._desc_cache[concept_id]

    def path(self, start: str, target: str) -> list[str]:
        """Shortest chain from `start` down its prerequisites to `target`, inclusive."""
        if start == target:
            return [start]
        prev: dict[str, str] = {start: start}
        queue = deque([start])
        while queue:
            cid = queue.popleft()
            for req in self.nodes[cid].requires:
                if req in prev:
                    continue
                prev[req] = cid
                if req == target:
                    chain = [req]
                    while chain[-1] != start:
                        chain.append(prev[chain[-1]])
                    return list(reversed(chain))
                queue.append(req)
        return []

    def between(self, start: str, target: str) -> list[str]:
        """Concepts strictly between `start` and `target` on the shortest chain."""
        chain = self.path(start, target)
        return chain[1:-1]
