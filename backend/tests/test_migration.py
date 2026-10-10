"""An existing database from before NCERT classes upgrades in place."""

import sqlite3
import tempfile

from sqlalchemy import create_engine, inspect


def test_old_database_gets_new_columns(monkeypatch):
    path = tempfile.NamedTemporaryFile(suffix=".db", delete=False).name
    con = sqlite3.connect(path)
    con.executescript("""
        CREATE TABLE concept (id VARCHAR PRIMARY KEY, name VARCHAR, description VARCHAR, level INTEGER);
        CREATE TABLE question (id VARCHAR PRIMARY KEY, concept_id VARCHAR, kind VARCHAR, prompt VARCHAR,
                               answer VARCHAR, is_repair BOOLEAN, generated BOOLEAN, distractors JSON);
        CREATE TABLE study_session (id VARCHAR PRIMARY KEY, label VARCHAR, phase VARCHAR,
                                    root_concept_id VARCHAR, explanation JSON, created_at DATETIME);
        INSERT INTO study_session (id, phase) VALUES ('old-session', 'done');
    """)
    con.close()

    from app import db

    engine = create_engine(f"sqlite:///{path}")
    monkeypatch.setattr(db, "engine", engine)
    db.init_db()

    cols = {t: {c["name"] for c in inspect(engine).get_columns(t)} for t in ("concept", "question", "study_session")}
    assert {"grade", "ncert"} <= cols["concept"]
    assert "grade" in cols["question"]
    assert "grade" in cols["study_session"]
    with engine.connect() as conn:
        assert conn.exec_driver_sql("SELECT grade FROM study_session WHERE id='old-session'").scalar() == 10
