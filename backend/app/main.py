import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from . import config
from .db import engine, init_db
from .routes import content, learning
from .seed import seed

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    with Session(engine) as db:
        seed(db)
    yield


app = FastAPI(
    title="Concept Debt API",
    version="0.1.0",
    description="Traces repeated mistakes through a prerequisite graph to the root concept.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(content.router)
app.include_router(learning.router)

# Bootstrap test UI at "/". Mounted last so it never shadows /api or /docs.
app.mount("/", StaticFiles(directory=config.STATIC_DIR, html=True), name="static")
