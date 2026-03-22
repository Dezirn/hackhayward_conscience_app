from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import battery, health, profile, recharge, tasks
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    origins = settings.cors_origins_list
    allow_credentials = origins != ["*"]

    app = FastAPI(title="Conscience API", version="0.1.0")
    app.include_router(health.router)
    app.include_router(profile.router)
    app.include_router(battery.router)
    app.include_router(tasks.router)
    app.include_router(recharge.router)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def root() -> dict[str, str]:
        return {
            "service": "conscience-api",
            "docs": "/docs",
            "health": "/health",
        }

    return app


app = create_app()
