from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.database import init_db
from .api import clients, mst, fibre, map, auth, activity, dashboard, seed
from .websocket.routes import websocket_router

app = FastAPI(
    title="ISP Operations Platform API",
    description="Comprehensive ISP management platform for fibre infrastructure, CRM, and network operations",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(mst.router, prefix="/api")
app.include_router(fibre.router, prefix="/api")
app.include_router(map.router, prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(seed.router, prefix="/api")

# WebSocket router
app.include_router(websocket_router)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    await init_db()


@app.get("/")
async def root():
    return {
        "message": "ISP Operations Platform API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}