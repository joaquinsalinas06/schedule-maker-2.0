import os
import traceback
import uvicorn
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

# Load environment variables using flexible configuration
from app.utils.config import load_environment, print_config_summary, validate_required_env_vars
load_environment()

# Database imports
from app.database.connection import engine, get_db, SessionLocal
from app.models import Base
from app.models.university import University
from app.models.user import User
from app.utils.security import get_password_hash

# Router imports
from app.routers import auth, courses, schedules, collaboration, websocket

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

# Database initialization functions
async def initialize_basic_data(db: Session):
    """Initialize UTEC university and admin user if they don't exist"""
    
    # Create UTEC university if it doesn't exist
    utec = db.query(University).filter(University.short_name == "UTEC").first()
    if not utec:
        utec = University(
            name="Universidad de Ingeniería y Tecnología",
            short_name="UTEC",
            time_format="hours",
            semester_info="Semester system with cycles 1-8 plus electives",
            parsing_config='{"time_format": "24h", "days": ["L", "M", "W", "J", "V", "S"]}'
        )
        db.add(utec)
        db.commit()
        db.refresh(utec)
    
    # Create admin user if environment variables are provided
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    
    if admin_email and admin_password:
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if not existing_admin:
            admin = User(
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                first_name=os.getenv("ADMIN_FIRST_NAME", "Admin"),
                last_name=os.getenv("ADMIN_LAST_NAME", "User"),
                university_id=utec.id,
                student_id=os.getenv("ADMIN_STUDENT_ID", "ADMIN001"),
                role="admin",
                is_verified=True,
                last_login=datetime.now()
            )
            db.add(admin)
            db.commit()
    
    # Install PostgreSQL unaccent extension if available
    try:
        result = db.execute(text("SELECT version()")).fetchone()
        if result and "PostgreSQL" in str(result[0]):
            ext_check = db.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'unaccent'")).fetchone()
            if not ext_check:
                try:
                    db.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))
                    db.commit()
                except Exception:
                    pass
    except Exception:
        pass

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database and basic data on startup"""
    try:
        # Print configuration summary for debugging
        print_config_summary()
        
        # Validate required environment variables
        missing_vars = validate_required_env_vars()
        if missing_vars:
            raise RuntimeError(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        # Create all database tables
        Base.metadata.create_all(bind=engine)
        
        # Run migrations for existing databases
        try:
            from migrations.add_user_profile_fields import run_migration
            run_migration()
            print("✅ Migrations completed successfully")
        except Exception as migration_error:
            print(f"⚠️ Migration warning: {str(migration_error)}")
            # Don't fail startup if migration fails (columns might already exist)
        
        # Initialize basic data
        db = SessionLocal()
        try:
            await initialize_basic_data(db)
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Startup failed: {str(e)}")
        traceback.print_exc()
        raise

# Include routers
app.include_router(auth.router)
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
        db = next(get_db())
        
        # Test database connection
        db.execute(text("SELECT 1"))
        
        # Check if basic data exists
        utec_count = db.query(University).filter(University.short_name == "UTEC").count()
        admin_count = db.query(User).filter(User.role == "admin").count()
        total_users = db.query(User).count()
        
        db.close()
        
        return {
            "status": "healthy", 
            "message": "Database connection is working",
            "initialization": {
                "utec_university": utec_count > 0,
                "admin_users": admin_count,
                "total_users": total_users
            }
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to Schedule Maker 2.0 API",
        "version": "2.0.0",
        "docs_url": "/docs",
        "health_check": "/health",
        "db_status": "/db-status"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)