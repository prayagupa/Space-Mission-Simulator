from fastapi import APIRouter

from app.api.routes import auth, challenges, crafting, missions, progress, session

api_router = APIRouter()
api_router.include_router(session.router, tags=["session"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(missions.router, tags=["missions"])
api_router.include_router(progress.router, tags=["progress"])
api_router.include_router(crafting.router, tags=["crafting"])
api_router.include_router(challenges.router, tags=["challenges"])
