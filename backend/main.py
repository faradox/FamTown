from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import logging
from pathlib import Path

from config import settings
from database import db_manager
from app.api import auth, events, pictures, files, texts, townsquare, profile, websocket, genai, view_configs, accounting
from app.services.accounting_service import seed_default_categories

# Configure logging with reduced database spam
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# ✅ FIX: Reduce SQLAlchemy console spam
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
logging.getLogger('sqlalchemy.pool').setLevel(logging.WARNING) 
logging.getLogger('sqlalchemy.dialects').setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

# ============ LIFESPAN MANAGEMENT ============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - startup and shutdown"""
    # Startup: seed default accounting categories if needed
    try:
        async with db_manager.get_session() as session:
            seeded = await seed_default_categories(session)
            if seeded:
                await session.commit()
                logger.info("Seeded default accounting categories")
    except Exception as e:
        logger.warning(f"Could not seed accounting categories: {e}")

    yield

    # Shutdown
    await db_manager.close()

# ============ FASTAPI APP ============

# Create FastAPI app with lifespan
app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description=settings.APP_DESCRIPTION,
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# CORS configuration (include HTTPS dev origins)
cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
https_variants = [
    "https://localhost:3000",
    "https://127.0.0.1:3000",
]
for origin in https_variants:
    if origin not in cors_origins:
        cors_origins.append(origin)
if settings.FRONTEND_URL:
    cors_origins.append(settings.FRONTEND_URL)
    try:
        if settings.FRONTEND_URL.startswith("http://"):
            cors_origins.append(settings.FRONTEND_URL.replace("http://", "https://", 1))
    except Exception:
        pass

# Add Capacitor/Ionic native origins
native_origins = [
    "capacitor://localhost",
    "ionic://localhost"
]
for origin in native_origins:
    if origin not in cors_origins:
        cors_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security/Permissions headers for sensors (helps mobile browsers)
@app.middleware("http")
async def permissions_policy_middleware(request: Request, call_next):
    response = await call_next(request)
    try:
        # Allow motion sensors and geolocation in dev; tighten in prod as needed
        response.headers["Permissions-Policy"] = (
            "geolocation=(self), accelerometer=*, gyroscope=*, magnetometer=*"
        )
        # Hint that cross-origin isolation not required; can be adjusted later
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
    except Exception:
        pass
    return response

# Mount static files for uploads
upload_path = Path(settings.UPLOAD_DIR)
upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(events.router)
app.include_router(pictures.router)
app.include_router(files.router)
app.include_router(texts.router)
app.include_router(townsquare.router)
app.include_router(profile.router)
app.include_router(websocket.router)
app.include_router(genai.router)
app.include_router(view_configs.router)
app.include_router(accounting.router)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint for health check"""
    return JSONResponse({
        "status": "healthy",
        "message": f"{settings.APP_NAME} API is running",
        "version": "1.0.0"
    })

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "message": str(exc) if settings.DEBUG else "An error occurred"}
    )

# ============ MAIN ============

if __name__ == "__main__":
    port = int(settings.PORT or 8000)
    logger.info(f"🚀 Starting backend on port {port}")
    environment = settings.ENVIRONMENT
    # Use multiple workers in production for concurrency; single process in dev for reload
    uvicorn_kwargs = dict(
        host="0.0.0.0",
        port=port,
        reload=settings.DEBUG,
        log_level="info",
        loop="asyncio",
    )
    if str(environment).lower() == "production":
        uvicorn_kwargs["workers"] = 8
    uvicorn.run("main:app", **uvicorn_kwargs) 
