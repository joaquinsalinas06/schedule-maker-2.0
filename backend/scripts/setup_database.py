#!/usr/bin/env python3
"""
Database setup script for Schedule Maker 2.0
Creates admin user, UTEC university, and sample courses with proper structure.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import SessionLocal, engine
from app.models.base import BaseModel
from app.models.user import User
from app.models.university import University
from app.models.course import Course
from app.models.section import Section
from app.models.session import Session
from app.utils.security import get_password_hash
from datetime import datetime, time
import random

def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    BaseModel.metadata.create_all(bind=engine)
    print("✓ Tables created")

def create_admin_user(db):
    """Create admin user"""
    print("Creating admin user...")
    
    # Check if admin already exists
    admin = db.query(User).filter(User.email == "admin@utec.edu.pe").first()
    if admin:
        print("✓ Admin user already exists")
        return admin
    
    # Get UTEC university ID
    utec = db.query(University).filter(University.short_name == "UTEC").first()
    if not utec:
        raise Exception("UTEC university not found. Create university first.")
    
    admin_user = User(
        email="admin@utec.edu.pe",
        hashed_password=get_password_hash("admin123"),
        first_name="Admin",
        last_name="UTEC",
        university_id=utec.id,
        student_id="ADMIN001",
        role="admin",
        is_verified=True,
        last_login=datetime.now()
    )
    
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    print("✓ Admin user created with email: admin@utec.edu.pe / password: admin123")
    return admin_user

def create_utec_university(db):
    """Create UTEC university"""
    print("Creating UTEC university...")
    
    # Check if UTEC already exists
    utec = db.query(University).filter(University.short_name == "UTEC").first()
    if utec:
        print("✓ UTEC university already exists")
        return utec
    
    utec_university = University(
        name="Universidad de Ingeniería y Tecnología",
        short_name="UTEC",
        time_format="hours",
        semester_info="Semester system with cycles 1-8 plus electives",
        parsing_config="{\"time_format\": \"24h\", \"days\": [\"L\", \"M\", \"W\", \"J\", \"V\", \"S\"]}"
    )
    
    db.add(utec_university)
    db.commit()
    db.refresh(utec_university)
    
    print("✓ UTEC university created")
    return utec_university

# Note: Sample course creation removed - use CSV import instead

def main():
    """Main setup function"""
    print("=== Schedule Maker 2.0 Database Setup ===")
    
    try:
        # Create tables
        create_tables()
        
        # Create database session
        db = SessionLocal()
        
        try:
            # Create UTEC university
            utec = create_utec_university(db)
            
            # Create admin user
            admin = create_admin_user(db)
            
            print("\n=== Setup Complete ===")
            print(f"✓ University: {utec.name} ({utec.short_name})")
            print(f"✓ Admin User: {admin.email}")
            print("\nLogin credentials:")
            print("  Email: admin@utec.edu.pe")
            print("  Password: admin123")
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Setup failed: {str(e)}")
        raise

if __name__ == "__main__":
    main()