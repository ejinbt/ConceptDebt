from collections.abc import Iterator

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from . import config

_connect_args = {"check_same_thread": False} if config.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(config.DATABASE_URL, connect_args=_connect_args, pool_pre_ping=True)


# Columns added after the first release. create_all() only creates missing
# tables, so add missing columns to existing ones (keeps live data).
_ADDED_COLUMNS = [
    ("concept", "grade", "INTEGER NOT NULL DEFAULT 0"),
    ("concept", "ncert", "VARCHAR NOT NULL DEFAULT ''"),
    ("question", "grade", "INTEGER"),
    ("study_session", "grade", "INTEGER NOT NULL DEFAULT 10"),
]


def _migrate() -> None:
    insp = inspect(engine)
    with engine.begin() as conn:
        for table, column, ddl in _ADDED_COLUMNS:
            if insp.has_table(table) and column not in {c["name"] for c in insp.get_columns(table)}:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))


def init_db() -> None:
    from . import models  # noqa: F401  (registers tables)

    SQLModel.metadata.create_all(engine)
    _migrate()


def get_db() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
