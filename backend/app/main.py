from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import database and models
from app.database.connection import engine, get_db, SessionLocal
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

# Database initialization
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    try:
        # Create tables
        Base.metadata.create_all(bind=engine)
        print("✓ Database tables created")
        
        # Initialize basic data if needed
        db = SessionLocal()
        try:
            from app.models.university import University
            from app.models.user import User
            from app.utils.security import get_password_hash
            from datetime import datetime
            
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
                print("✓ UTEC university created")
            
            # Create admin user if it doesn't exist (using Railway env vars)
            admin_email = os.getenv("ADMIN_EMAIL")
            admin_password = os.getenv("ADMIN_PASSWORD")
            
            if admin_email and admin_password:
                admin = db.query(User).filter(User.email == admin_email).first()
                if not admin:
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
                    print(f"✓ Admin user created: {admin_email}")
                else:
                    print(f"✓ Admin user already exists: {admin_email}")
            else:
                print("⚠️ Admin user not created - ADMIN_EMAIL and ADMIN_PASSWORD env vars required")
            
            print("✓ Database initialization complete - ready for CSV import")
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")

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