"""
LearnLens — Adaptive AI Micro-Tutor
FastAPI Backend Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models.database import init_db
from routers import documents, quizzes, progress

app = FastAPI(
    title="LearnLens API",
    description="Adaptive AI Micro-Tutor — Transform lecture PDFs into personalized quizzes with Socratic hints",
    version="1.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(documents.router)
app.include_router(quizzes.router)
app.include_router(progress.router)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()
    print("✨ LearnLens API started successfully!")
    print("📚 Database initialized")
    print("🔗 API docs available at /docs")


@app.get("/")
async def root():
    return {
        "name": "LearnLens API",
        "version": "1.0.0",
        "description": "Adaptive AI Micro-Tutor",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "LearnLens"}
