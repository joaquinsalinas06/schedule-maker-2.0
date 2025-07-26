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

def create_sample_courses(db, university_id):
    """Create sample courses with proper structure"""
    print("Creating sample courses...")
    
    # Delete existing courses for fresh start
    db.query(Course).filter(Course.university_id == university_id).delete()
    db.commit()
    
    # Course data with proper career and cycle structure
    sample_courses = [
        # Computer Science (CS) courses
        {"code": "CS1010", "name": "Introducción a la Programación", "credits": 4, "department": "CS", "semester": "ciclo-1", "description": "Fundamentos de programación"},
        {"code": "CS1020", "name": "Programación Orientada a Objetos", "credits": 4, "department": "CS", "semester": "ciclo-2", "description": "POO con Java"},
        {"code": "CS2010", "name": "Estructuras de Datos", "credits": 4, "department": "CS", "semester": "ciclo-3", "description": "Estructuras de datos básicas"},
        {"code": "CS2020", "name": "Algoritmos Avanzados", "credits": 4, "department": "CS", "semester": "ciclo-4", "description": "Análisis de algoritmos"},
        {"code": "CS3010", "name": "Base de Datos", "credits": 4, "department": "CS", "semester": "ciclo-5", "description": "Diseño y gestión de BD"},
        {"code": "CS3020", "name": "Ingeniería de Software", "credits": 4, "department": "CS", "semester": "ciclo-6", "description": "Metodologías de desarrollo"},
        {"code": "CS4010", "name": "Inteligencia Artificial", "credits": 4, "department": "CS", "semester": "ciclo-7", "description": "IA y Machine Learning"},
        {"code": "CS4020", "name": "Sistemas Distribuidos", "credits": 4, "department": "CS", "semester": "ciclo-8", "description": "Arquitecturas distribuidas"},
        
        # Data Science (DS) courses
        {"code": "DS1010", "name": "Estadística Descriptiva", "credits": 3, "department": "DS", "semester": "ciclo-1", "description": "Fundamentos estadísticos"},
        {"code": "DS1020", "name": "Probabilidades", "credits": 3, "department": "DS", "semester": "ciclo-2", "description": "Teoría de probabilidades"},
        {"code": "DS2010", "name": "Estadística Inferencial", "credits": 4, "department": "DS", "semester": "ciclo-3", "description": "Inferencia estadística"},
        {"code": "DS2020", "name": "Análisis de Datos con Python", "credits": 4, "department": "DS", "semester": "ciclo-4", "description": "Python para análisis"},
        {"code": "DS3010", "name": "Machine Learning", "credits": 4, "department": "DS", "semester": "ciclo-5", "description": "Aprendizaje automático"},
        {"code": "DS3020", "name": "Deep Learning", "credits": 4, "department": "DS", "semester": "ciclo-6", "description": "Redes neuronales"},
        
        # Biology (BIO) courses
        {"code": "BIO1010", "name": "Biología General", "credits": 4, "department": "BIO", "semester": "ciclo-1", "description": "Fundamentos de biología"},
        {"code": "BIO1020", "name": "Química Orgánica", "credits": 4, "department": "BIO", "semester": "ciclo-2", "description": "Química orgánica básica"},
        {"code": "BIO2010", "name": "Microbiología", "credits": 4, "department": "BIO", "semester": "ciclo-3", "description": "Estudio de microorganismos"},
        {"code": "BIO2020", "name": "Genética", "credits": 4, "department": "BIO", "semester": "ciclo-4", "description": "Principios genéticos"},
        
        # Industrial Engineering (IND) courses
        {"code": "IND1010", "name": "Introducción a la Ingeniería", "credits": 3, "department": "IND", "semester": "ciclo-1", "description": "Fundamentos de ingeniería"},
        {"code": "IND2010", "name": "Investigación de Operaciones", "credits": 4, "department": "IND", "semester": "ciclo-3", "description": "Optimización"},
        {"code": "IND3010", "name": "Gestión de la Calidad", "credits": 4, "department": "IND", "semester": "ciclo-5", "description": "Control de calidad"},
        
        # Mechatronics (MEC) courses
        {"code": "MEC1010", "name": "Física I", "credits": 4, "department": "MEC", "semester": "ciclo-1", "description": "Mecánica clásica"},
        {"code": "MEC1020", "name": "Física II", "credits": 4, "department": "MEC", "semester": "ciclo-2", "description": "Electromagnetismo"},
        {"code": "MEC2010", "name": "Mecánica de Materiales", "credits": 4, "department": "MEC", "semester": "ciclo-3", "description": "Resistencia de materiales"},
        
        # Civil Engineering (CIV) courses
        {"code": "CIV1010", "name": "Dibujo Técnico", "credits": 3, "department": "CIV", "semester": "ciclo-1", "description": "Dibujo en ingeniería"},
        {"code": "CIV2010", "name": "Mecánica de Suelos", "credits": 4, "department": "CIV", "semester": "ciclo-3", "description": "Propiedades del suelo"},
        
        # Electives
        {"code": "ELE1010", "name": "Emprendimiento", "credits": 3, "department": "ELE", "semester": "electivo", "description": "Desarrollo empresarial"},
        {"code": "ELE1020", "name": "Ética Profesional", "credits": 2, "department": "ELE", "semester": "electivo", "description": "Ética en ingeniería"},
        {"code": "ELE1030", "name": "Inglés Técnico", "credits": 3, "department": "ELE", "semester": "electivo", "description": "Inglés para ingeniería"},
    ]
    
    # Time slots for scheduling
    time_slots = [
        ("07:00", "08:30"), ("08:30", "10:00"), ("10:00", "11:30"), 
        ("11:30", "13:00"), ("13:00", "14:30"), ("14:30", "16:00"),
        ("16:00", "17:30"), ("17:30", "19:00"), ("19:00", "20:30")
    ]
    
    days_of_week = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
    professors = [
        "Dr. García López", "Dra. María Rodriguez", "Dr. Carlos Mendoza",
        "Dra. Ana Torres", "Dr. Luis Vargas", "Dra. Elena Castro",
        "Dr. Miguel Santos", "Dra. Carmen Ruiz", "Dr. Fernando Herrera"
    ]
    
    for course_data in sample_courses:
        # Create course
        course = Course(
            university_id=university_id,
            code=course_data["code"],
            name=course_data["name"],
            credits=course_data["credits"],
            department=course_data["department"],
            semester=course_data["semester"],
            description=course_data["description"]
        )
        
        db.add(course)
        db.commit()
        db.refresh(course)
        
        # Create 2-3 sections per course
        num_sections = random.randint(2, 3)
        for i in range(num_sections):
            section_code = f"SEC{i+1:02d}"
            professor = random.choice(professors)
            capacity = random.randint(25, 35)
            enrolled = random.randint(10, capacity-5)
            
            section = Section(
                course_id=course.id,
                section_number=section_code,
                professor=professor,
                capacity=capacity,
                enrolled=enrolled,
                semester=course_data["semester"]  # Set semester from course data
            )
            
            db.add(section)
            db.commit()
            db.refresh(section)
            
            # Create 2-3 sessions per section (class meetings per week)
            num_sessions = 2 if course_data["credits"] <= 3 else 3
            used_days = set()
            
            for j in range(num_sessions):
                # Select unique days for this section
                available_days = [day for day in days_of_week if day not in used_days]
                if not available_days:
                    available_days = days_of_week  # Reset if all days used
                
                day = random.choice(available_days)
                used_days.add(day)
                
                start_time_str, end_time_str = random.choice(time_slots)
                start_time_obj = time(*map(int, start_time_str.split(':')))
                end_time_obj = time(*map(int, end_time_str.split(':')))
                
                session = Session(
                    section_id=section.id,
                    day=day,
                    start_time=start_time_obj,
                    end_time=end_time_obj,
                    session_type="lecture",
                    location=f"Aula {random.randint(101, 305)}",
                    modality="presencial"
                )
                
                db.add(session)
    
    db.commit()
    print(f"✓ Created {len(sample_courses)} courses with sections and sessions")

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