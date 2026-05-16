from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.api.ws.mission import router as ws_router
from app.config import settings
from app.database import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    from scripts.seed_missions import seed_if_empty

    seed_if_empty()
    yield


app = FastAPI(
    title="Space Mission Simulator API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(ws_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
