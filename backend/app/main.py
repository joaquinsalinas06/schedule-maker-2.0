from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import database and models
from app.database.connection import engine, get_db
from app.models import Base

# Import routers
from app.routers import auth, universities, courses, schedules, collaboration, websocket

# Create FastAPI app
app = FastAPI(
    title="Schedule Maker 2.0 API",
    description="API for university schedule management system",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(universities.router)
app.include_router(courses.router)
app.include_router(schedules.router)
app.include_router(collaboration.router)
app.include_router(websocket.router)

# Health check endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Schedule Maker 2.0 API is running"}

@app.get("/db-status")
async def database_status():
    try:
        from sqlalchemy import text
        db = next(get_db())
        # Simple query to test database connection
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "healthy", "message": "Database connection is working"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

# Startup event to create tables
@app.on_event("startup")
async def startup_event():
    # Create database tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully")

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to Schedule Maker 2.0 API",
        "version": "2.0.0",
        "docs_url": "/docs",
        "health_check": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)