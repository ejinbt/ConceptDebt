"""The AI layer with a fake OpenAI-compatible client (no network)."""

from types import SimpleNamespace

from app import ai


def _fake(content: str):
    reply = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])
    completions = SimpleNamespace(create=lambda **_: reply)
    return SimpleNamespace(chat=SimpleNamespace(completions=completions))


CANDIDATES = [{"id": "partial_distribution", "name": "Distributes to the first term only", "description": ""}]


def test_classify_parses_and_clamps(monkeypatch):
    monkeypatch.setattr(ai, "enabled", lambda: True)
    monkeypatch.setattr(ai, "_get_client", lambda: _fake(
        '<think>hmm</think>```json\n{"misconception_id": "partial_distribution", "confidence": 0.99, "rationale": "Only x was multiplied."}\n```'
    ))
    mid, conf, why = ai.classify_mistake("Expand 3(x + 2)", "3x + 6", "3x + 5", None, CANDIDATES)
    assert mid == "partial_distribution" and conf == 0.85 and why


def test_classify_rejects_unknown_ids(monkeypatch):
    monkeypatch.setattr(ai, "enabled", lambda: True)
    monkeypatch.setattr(ai, "_get_client", lambda: _fake('{"misconception_id": "made_up", "confidence": 0.7, "rationale": "x"}'))
    mid, conf, _ = ai.classify_mistake("q", "a", "b", None, CANDIDATES)
    assert mid is None and conf == 0.0


def test_garbage_reply_falls_back(monkeypatch):
    monkeypatch.setattr(ai, "enabled", lambda: True)
    monkeypatch.setattr(ai, "_get_client", lambda: _fake("Sorry, I can't help with that."))
    assert ai.classify_mistake("q", "a", "b", None, CANDIDATES) is None
    assert ai.explain({"wrong": 1}) is None


def test_generated_questions_are_validated(monkeypatch):
    monkeypatch.setattr(ai, "enabled", lambda: True)
    monkeypatch.setattr(ai, "_get_client", lambda: _fake(
        '{"questions": ['
        '{"prompt": "Expand 2(x + 7)", "answer": "2x + 14", "kind": "expression",'
        ' "distractors": [{"answer": "2x + 7", "misconception_id": "partial_distribution"},'
        '                 {"answer": "2x + 14", "misconception_id": "partial_distribution"}]},'
        '{"prompt": "Broken", "answer": "import os;", "kind": "expression", "distractors": []}]}'
    ))
    qs = ai.generate_repair_questions({"name": "Distributive", "description": ""}, CANDIDATES, 3)
    assert len(qs) == 1
    assert qs[0]["distractors"] == [{"answer": "2x + 7", "misconception_id": "partial_distribution"}]
