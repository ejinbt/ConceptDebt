"""End-to-end demo from section 11 of the brief."""


def test_demo_flow(client):
    s = client.post("/api/demo/session").json()
    sid = s["session_id"]
    assert s["answered"] == 15 and s["grade"] == 10

    score = client.get(f"/api/sessions/{sid}/score").json()
    assert score["correct"] == 8 and score["answered"] == 15

    analysis = client.post(f"/api/sessions/{sid}/debug").json()
    root = analysis["root"]
    assert root["concept_id"] == "distributive"
    assert root["grade"] == 7 and root["ncert"] == "Class 7 · Algebraic Expressions"
    assert root["debt"] >= 80
    assert root["mistakes"] == 6
    assert analysis["trace"][-1]["concept_id"] == "distributive"
    assert analysis["explanation"]["source"] == "template"

    repair = client.post(f"/api/sessions/{sid}/repair?count=3").json()
    assert [q["concept_id"] for q in repair["questions"]] == ["distributive"] * 3
    answers = {"r-dist-1": "4x + 20", "r-dist-2": "-3x - 6", "r-dist-3": "10x - 5"}
    for q in repair["questions"]:
        r = client.post("/api/attempts", json={"session_id": sid, "question_id": q["id"], "answer": answers[q["id"]]})
        assert r.json()["correct"]

    result = client.post(f"/api/sessions/{sid}/reverify").json()
    assert result["root_before"] >= 80
    assert result["root_after"] <= 35
    assert result["repair_correct"] == 3


def test_attempt_detects_misconception(client):
    sid = client.post("/api/sessions", json={}).json()["session_id"]
    r = client.post("/api/attempts", json={"session_id": sid, "question_id": "d05", "answer": "3x+2"}).json()
    assert r["correct"] is False
    assert r["misconception"]["id"] == "partial_distribution"
    assert r["source"] == "rule"

    r = client.post("/api/attempts", json={"session_id": sid, "question_id": "d05", "answer": "3x + 5"}).json()
    assert r["source"] == "unclassified" and r["confidence"] == 0.3


def test_reanswer_replaces_previous_attempt(client):
    sid = client.post("/api/sessions", json={}).json()["session_id"]
    client.post("/api/attempts", json={"session_id": sid, "question_id": "d05", "answer": "3x+2"})
    client.post("/api/attempts", json={"session_id": sid, "question_id": "d05", "answer": "3x+6"})
    attempts = client.get(f"/api/sessions/{sid}/attempts").json()
    assert len(attempts) == 1 and attempts[0]["correct"] is True
    assert client.get(f"/api/sessions/{sid}/debt").json()["wrong"] == 0


def test_graph_and_content(client):
    g = client.get("/api/graph").json()
    assert len(g["nodes"]) == 26
    assert {"source": "distributive", "target": "alg_manip", "id": "distributive->alg_manip"} in g["edges"]
    qs = client.get("/api/diagnostic").json()
    assert len(qs) == 15 and "answer" not in qs[0]
    assert client.get("/api/health").json()["ai_enabled"] is False


def test_errors(client):
    assert client.get("/api/sessions/nope").status_code == 404
    sid = client.post("/api/sessions").json()["session_id"]
    assert client.post(f"/api/sessions/{sid}/repair").status_code == 409
    assert client.post("/api/attempts", json={"session_id": sid, "question_id": "zzz", "answer": "1"}).status_code == 404


def test_gibberish_is_invalid_and_ignored(client):
    sid = client.post("/api/sessions", json={}).json()["session_id"]
    for answer in ["hello", ")))", "idk"]:
        r = client.post("/api/attempts", json={"session_id": sid, "question_id": "d05", "answer": answer}).json()
        assert r["source"] == "invalid" and r["correct"] is False and r["misconception"] is None
    r = client.post("/api/attempts", json={"session_id": sid, "question_id": "d09", "answer": "seven"}).json()
    assert r["source"] == "invalid"

    score = client.get(f"/api/sessions/{sid}/score").json()
    assert score["answered"] == 0
    analysis = client.get(f"/api/sessions/{sid}/debt").json()
    assert analysis["wrong"] == 0 and analysis["concepts"] == []

    # a real wrong answer in the same session still counts
    r = client.post("/api/attempts", json={"session_id": sid, "question_id": "d05", "answer": "3y + 6"}).json()
    assert r["source"] == "invalid"  # y is not in the question
    r = client.post("/api/attempts", json={"session_id": sid, "question_id": "d05", "answer": "3x + 2"}).json()
    assert r["source"] == "rule"


def test_health_reports_ai_stats(client):
    h = client.get("/api/health").json()
    assert set(h["ai_stats"]) == {"calls", "ok", "failed", "last_error"}
