from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import create_router
from .core.container import get_embedding_service


def create_app() -> FastAPI:
    app = FastAPI(
        title="Embedding Lab API",
        description="An in-memory embedding playground for learning and demos.",
        version="1.0.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(create_router(get_embedding_service()))
    return app


app = create_app()
