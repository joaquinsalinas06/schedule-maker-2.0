#!/usr/bin/env python3
"""
Script to generate fake courses for UTEC using Faker
This creates realistic course data for testing and development
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from faker import Faker
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal, engine
from app.models.university import University
from app.models.course import Course
from app.models.section import Section
from app.models.session import Session as SessionModel
from datetime import time
import random

fake = Faker('es_ES')  # Spanish locale for UTEC

# UTEC Engineering Departments and Course Patterns
DEPARTMENTS = {
    "Ingeniería Civil": ["CIV", "EST", "GEO"],
    "Ingeniería Industrial": ["IND", "GES", "SIS"],
    "Ingeniería de Sistemas": ["CSX", "ALG", "DAT", "WEB"],
    "Ingeniería Mecánica": ["MEC", "TER", "FLU"],
    "Ingeniería Electrónica": ["ELE", "CIR", "TEL"],
    "Ingeniería Química": ["QUI", "PRO", "BIO"],
    "Ingeniería de la Energía": ["ENE", "SOL", "REN"],
    "Ingeniería Ambiental": ["AMB", "ECO", "SOS"],
    "Ingeniería Biomédica": ["BIO", "MED", "TEJ"],
    "Ciencias": ["MAT", "FIS", "QUI", "BIO"]
}

# Common course types and their patterns
COURSE_TYPES = {
    "Matemáticas": ["Cálculo", "Álgebra", "Estadística", "Matemática Discreta", "Ecuaciones Diferenciales"],
    "Física": ["Física", "Mecánica", "Termodinámica", "Electromagnetismo"],
    "Programación": ["Programación", "Algoritmos", "Estructuras de Datos", "Base de Datos"],
    "Ingeniería": ["Diseño", "Análisis", "Optimización", "Simulación", "Modelado"],
    "Gestión": ["Gestión", "Administración", "Finanzas", "Marketing", "Liderazgo"],
    "Humanidades": ["Ética", "Comunicación", "Historia", "Filosofía", "Arte"]
}

# Time slots for sessions
TIME_SLOTS = [
    (time(7, 0), time(8, 30)),   # 07:00-08:30
    (time(8, 30), time(10, 0)),  # 08:30-10:00
    (time(10, 0), time(11, 30)), # 10:00-11:30
    (time(11, 30), time(13, 0)), # 11:30-13:00
    (time(13, 0), time(14, 30)), # 13:00-14:30
    (time(14, 30), time(16, 0)), # 14:30-16:00
    (time(16, 0), time(17, 30)), # 16:00-17:30
    (time(17, 30), time(19, 0)), # 17:30-19:00
    (time(19, 0), time(20, 30)), # 19:00-20:30
]

DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

PROFESSORS = [
    "Dr. Carlos Mendoza", "Dra. Ana Rodríguez", "Dr. Luis García", "Dra. María González",
    "Dr. José Vargas", "Dra. Carmen Silva", "Dr. Roberto Torres", "Dra. Elena Morales",
    "Dr. Fernando Castillo", "Dra. Patricia Herrera", "Dr. Miguel Ángel Pérez", "Dra. Sofía Ramírez",
    "Dr. Alejandro Cruz", "Dra. Gabriela Flores", "Dr. Ricardo Vega", "Dra. Mónica Jiménez",
    "Dr. Jorge Salinas", "Dra. Claudia Restrepo", "Dr. Andrés Muñoz", "Dra. Valeria Ortega"
]

LOCATIONS = [
    "Aula A101", "Aula A102", "Aula A103", "Aula B201", "Aula B202", "Aula B203",
    "Lab. Física 1", "Lab. Física 2", "Lab. Química", "Lab. Biología",
    "Lab. Computación 1", "Lab. Computación 2", "Lab. Computación 3",
    "Taller Mecánica", "Taller Electrónica", "Auditorio Principal",
    "Sala de Conferencias", "Aula Magna", "Biblioteca - Sala 1", "Online"
]

MODALITIES = ["Presencial", "Virtual", "Híbrido"]

def get_utec_university(db: Session) -> University:
    """Get or create UTEC university"""
    utec = db.query(University).filter(University.short_name == "UTEC").first()
    if not utec:
        utec = University(
            name="Universidad de Ingeniería y Tecnología",
            short_name="UTEC"
        )
        db.add(utec)
        db.commit()
        db.refresh(utec)
    return utec

def generate_course_name(department: str, course_type: str) -> str:
    """Generate realistic course name"""
    level = random.choice(["I", "II", "III", "IV", "Avanzado", "Básico"])
    
    if course_type in ["Cálculo", "Física", "Programación"]:
        return f"{course_type} {level}"
    elif random.choice([True, False]):
        return f"{course_type} en {department}"
    else:
        specialized_terms = {
            "Ingeniería Civil": ["Estructuras", "Hidráulica", "Geotecnia", "Construcción"],
            "Ingeniería Industrial": ["Procesos", "Calidad", "Logística", "Operaciones"],
            "Ingeniería de Sistemas": ["Software", "Redes", "Seguridad", "Inteligencia Artificial"],
            "Ingeniería Mecánica": ["Materiales", "Manufactura", "Control", "Robótica"],
            "Ingeniería Electrónica": ["Control", "Comunicaciones", "Señales", "Microcontroladores"],
        }
        if department in specialized_terms:
            term = random.choice(specialized_terms[department])
            return f"{course_type} de {term}"
        return f"{course_type} Aplicado"

def generate_course_code(dept_code: str, level: int) -> str:
    """Generate course code like CSX101, MAT201, etc."""
    course_number = random.randint(100 + (level-1)*100, 199 + (level-1)*100)
    return f"{dept_code}{course_number}"

def generate_course_description(name: str, department: str) -> str:
    """Generate realistic course description"""
    templates = [
        f"Curso fundamental de {name.lower()} orientado a estudiantes de {department}. "
        f"Incluye conceptos teóricos y aplicaciones prácticas en el campo de la ingeniería.",
        
        f"Este curso cubre los aspectos esenciales de {name.lower()} con énfasis en "
        f"metodologías modernas y herramientas tecnológicas aplicadas.",
        
        f"Introducción a {name.lower()} con enfoque en resolución de problemas "
        f"y desarrollo de competencias técnicas para el ejercicio profesional.",
        
        f"Curso teórico-práctico que aborda {name.lower()} desde una perspectiva "
        f"integral, combinando fundamentos teóricos con casos de estudio reales."
    ]
    return random.choice(templates)

def create_sessions_for_section(section: Section, db: Session, course_credits: int):
    """Create realistic sessions for a section"""
    session_types = []
    
    # Determine session types based on credits
    if course_credits >= 4:
        session_types = ["Teoría", "Práctica", "Laboratorio"]
    elif course_credits >= 3:
        session_types = ["Teoría", "Práctica"]
    else:
        session_types = ["Teoría"]
    
    sessions_per_week = min(course_credits, 4)  # Max 4 sessions per week
    
    # Distribute sessions across the week
    available_days = random.sample(DAYS[:5], min(sessions_per_week, 5))  # Weekdays only
    
    for i, day in enumerate(available_days):
        session_type = session_types[i % len(session_types)]
        start_time, end_time = random.choice(TIME_SLOTS)
        
        # Avoid scheduling conflicts
        existing_session = db.query(SessionModel).filter(
            SessionModel.section_id == section.id,
            SessionModel.day == day,
            SessionModel.start_time == start_time
        ).first()
        
        if not existing_session:
            session = SessionModel(
                section_id=section.id,
                session_type=session_type,
                day=day,
                start_time=start_time,
                end_time=end_time,
                location=random.choice(LOCATIONS),
                modality=random.choice(MODALITIES),
                is_active=True
            )
            db.add(session)

def generate_fake_courses(db: Session, num_courses: int = 150):
    """Generate fake courses for UTEC"""
    utec = get_utec_university(db)
    
    print(f"Generating {num_courses} fake courses for UTEC...")
    
    generated_codes = set()
    
    for i in range(num_courses):
        # Select department and course type
        department = random.choice(list(DEPARTMENTS.keys()))
        dept_codes = DEPARTMENTS[department]
        dept_code = random.choice(dept_codes)
        
        course_type_category = random.choice(list(COURSE_TYPES.keys()))
        course_type = random.choice(COURSE_TYPES[course_type_category])
        
        # Generate unique course code
        level = random.randint(1, 4)  # 1-4 corresponding to academic years
        attempts = 0
        while attempts < 10:
            course_code = generate_course_code(dept_code, level)
            if course_code not in generated_codes:
                generated_codes.add(course_code)
                break
            attempts += 1
        else:
            # Fallback with random suffix
            course_code = f"{dept_code}{random.randint(100, 999)}"
            generated_codes.add(course_code)
        
        # Generate course details
        course_name = generate_course_name(department, course_type)
        course_description = generate_course_description(course_name, department)
        credits = random.choices([2, 3, 4, 5], weights=[10, 40, 40, 10])[0]
        
        # Create course
        course = Course(
            university_id=utec.id,
            code=course_code,
            name=course_name,
            description=course_description,
            credits=credits,
            department=department,
            level=level,
            is_active=True
        )
        db.add(course)
        db.flush()  # Get the course ID
        
        # Generate 2-4 sections per course
        num_sections = random.randint(2, 4)
        for section_num in range(1, num_sections + 1):
            section = Section(
                course_id=course.id,
                section_number=f"{section_num:02d}",
                semester="2024-2",
                professor=random.choice(PROFESSORS),
                capacity=random.randint(25, 40),
                enrolled=random.randint(15, 35),
                is_active=True
            )
            db.add(section)
            db.flush()  # Get the section ID
            
            # Create sessions for this section
            create_sessions_for_section(section, db, credits)
        
        if (i + 1) % 20 == 0:
            print(f"Generated {i + 1} courses...")
            db.commit()
    
    db.commit()
    print(f"Successfully generated {num_courses} courses with sections and sessions!")

def main():
    """Main execution function"""
    print("Starting fake course generation for UTEC...")
    
    # Get database connection
    db = SessionLocal()
    
    try:
        # Check if UTEC already has many courses
        utec = db.query(University).filter(University.short_name == "UTEC").first()
        if utec:
            existing_courses = db.query(Course).filter(Course.university_id == utec.id).count()
            print(f"UTEC currently has {existing_courses} courses")
            
            if existing_courses > 50:
                try:
                    response = input("UTEC already has many courses. Continue? (y/n): ")
                    if response.lower() != 'y':
                        print("Operation cancelled.")
                        return
                except EOFError:
                    print("Non-interactive mode, continuing with generation...")
        
        # Generate courses
        try:
            user_input = input("How many courses to generate? (default 150): ")
            num_courses = int(user_input) if user_input.strip() else 150
        except EOFError:
            # Non-interactive mode, use default
            num_courses = 150
            print(f"Running in non-interactive mode, generating {num_courses} courses")
        generate_fake_courses(db, num_courses)
        
        print("\n✅ Fake course generation completed successfully!")
        print(f"Generated {num_courses} courses for UTEC with realistic:")
        print("- Course codes (CSX101, MAT201, etc.)")
        print("- Department-specific names")
        print("- Multiple sections per course")
        print("- Realistic class schedules")
        print("- Professor assignments")
        print("- Classroom locations")
        
    except Exception as e:
        print(f"❌ Error generating fake courses: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()