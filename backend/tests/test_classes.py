"""NCERT class selection: per-class tests, tracing only downwards, hiding what's ahead."""


def new_session(client, grade):
    return client.post("/api/sessions", json={"grade": grade}).json()["session_id"]


def answer(client, sid, qid, text="", not_learned=False):
    return client.post("/api/attempts", json={
        "session_id": sid, "question_id": qid, "answer": text, "not_learned": not_learned,
    })


def test_classes_list(client):
    rows = client.get("/api/classes").json()
    assert [r["grade"] for r in rows] == [8, 9, 10]
    assert all(r["questions"] >= 10 for r in rows)


def test_invalid_grade_rejected(client):
    assert client.post("/api/sessions", json={"grade": 12}).status_code == 422
    assert client.get("/api/diagnostic?grade=5").status_code == 422


def test_diagnostic_follows_session_class(client):
    sid = new_session(client, 9)
    qs = client.get(f"/api/diagnostic?session_id={sid}").json()
    assert qs and all(q["id"].startswith("c9-") for q in qs)
    assert all(q["ncert"].startswith("Class ") for q in qs)
    # nothing above Class 9 is asked
    concepts = {c["id"]: c["grade"] for c in client.get("/api/concepts").json()}
    assert max(concepts[q["concept_id"]] for q in qs) <= 9


def test_class8_root_and_locked_graph(client):
    sid = new_session(client, 8)
    qs = {q["id"]: q for q in client.get(f"/api/diagnostic?session_id={sid}").json()}
    wrong = {"c8-05": "5x + 3", "c8-06": "-6x - 4", "c8-09": "14/3", "c8-12": "4(x + 12)"}
    for qid in qs:
        answer(client, sid, qid, wrong.get(qid) or _correct(qid))

    analysis = client.post(f"/api/sessions/{sid}/debug").json()
    assert analysis["grade"] == 8
    assert analysis["root"]["concept_id"] == "distributive"
    assert "Class 7" in analysis["explanation"]["advice"]
    assert all(c["grade"] <= 8 for c in analysis["concepts"])

    nodes = {n["id"]: n for n in client.get(f"/api/graph?session_id={sid}").json()["nodes"]}
    assert nodes["quadratics"]["status"] == "locked" and nodes["quadratics"]["debt"] == 0
    assert nodes["polynomials"]["status"] == "locked"
    assert nodes["distributive"]["status"] == "root"


def test_not_learned_is_ignored(client):
    sid = new_session(client, 10)
    r = answer(client, sid, "d14", not_learned=True)
    assert r.status_code == 201 and r.json()["source"] == "not_learned"
    assert answer(client, sid, "d13", "").status_code == 422  # empty answer still needs not_learned
    analysis = client.get(f"/api/sessions/{sid}/debt").json()
    assert analysis["not_learned"] == 1 and analysis["wrong"] == 0 and analysis["concepts"] == []
    assert client.get(f"/api/sessions/{sid}/score").json()["answered"] == 0
    # answering it for real later replaces the mark
    assert answer(client, sid, "d14", "43").json()["misconception"]["id"] == "ap_n_not_n_minus_1"
    assert client.get(f"/api/sessions/{sid}/debt").json()["not_learned"] == 0


def test_default_session_is_class_10(client):
    s = client.post("/api/sessions", json={}).json()
    assert s["grade"] == 10


_ANSWERS = {}


def _correct(qid):
    if not _ANSWERS:
        import json
        from app import config
        bank = json.loads((config.SEED_DIR / "questions.json").read_text(encoding="utf-8"))
        _ANSWERS.update({q["id"]: q["answer"] for q in bank["diagnostic"]})
    return _ANSWERS[qid]
