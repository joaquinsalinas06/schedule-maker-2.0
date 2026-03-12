"""
Seed script for CS 2021 Curriculum (Ciencia de la Computación - UTEC)
Idempotent: safe to run multiple times.

Usage:
    cd backend
    source .venv/Scripts/activate  (or .venv/bin/activate on Linux/Mac)
    python -m scripts.seed_cs2021_curriculum
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.curriculum import Curriculum, CurriculumCourse, CurriculumPrerequisite
from app.models.university import University
from app.models.course import Course
import unicodedata


def normalize_name(name: str) -> str:
    """Remove accents and lowercase for fuzzy matching."""
    nfkd = unicodedata.normalize("NFKD", name)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()


# ── Course definitions: (name, semester, credits, is_elective) ──
COURSES = [
    # Semester 1
    ("Cálculo de una variable", 1, 4, False),
    ("Introducción a la Ciencia de la Computación", 1, 2, False),
    ("Matemáticas Discretas I", 1, 4, False),
    ("Programación I", 1, 4, False),
    ("Laboratorio de Comunicación 1", 1, 3, False),
    ("Proyectos Interdisciplinarios 1", 1, 3, False),
    # Semester 2
    ("Álgebra Lineal", 2, 2, False),
    ("Cálculo Vectorial", 2, 3, False),
    ("Óptica y Ondas", 2, 4, False),
    ("Matemáticas Discretas II", 2, 4, False),
    ("Programación II", 2, 4, False),
    ("Laboratorio de Comunicación 2", 2, 3, False),
    # Semester 3
    ("Estadística y Probabilidades I", 3, 4, False),
    ("Ecuaciones Diferenciales", 3, 3, False),
    ("Programación III", 3, 4, False),
    ("Desarrollo Basado en Plataformas", 3, 4, False),
    ("Base de Datos I", 3, 4, False),
    ("Proyectos Interdisciplinarios 2", 3, 3, False),
    # Semester 4
    ("Métodos Numéricos", 4, 3, False),
    ("Algoritmos y Estructuras de Datos", 4, 4, False),
    ("Teoría de la Computación", 4, 4, False),
    ("Cloud Computing", 4, 3, False),
    ("Arquitectura de Computadoras", 4, 4, False),
    ("Empresa y Consumidor", 4, 3, False),
    # Semester 5
    ("Base de Datos II", 5, 3, False),
    ("Compiladores", 5, 4, False),
    ("Análisis y Diseño de Algoritmos", 5, 4, False),
    ("Ingeniería de Software", 5, 4, False),
    ("Perú: Temas de la sociedad contemporánea", 5, 3, False),
    ("Proyectos Interdisciplinarios 3", 5, 3, False),
    # Semester 6
    ("Estructura de Datos Avanzados", 6, 4, False),
    ("Sistemas Operativos", 6, 4, False),
    ("Programación Competitiva", 6, 4, False),
    ("Machine Learning", 6, 4, False),
    ("Finanzas Empresariales", 6, 3, False),
    ("Economía, Gobernanza y Relaciones de Poder", 6, 3, False),
    # Semester 7
    ("Computación Gráfica", 7, 4, False),
    ("Computación Paralela y Distribuida", 7, 4, False),
    ("Interacción Humano Computador", 7, 4, False),
    ("Redes y Comunicaciones", 7, 3, False),
    ("ELECTIVO1", 7, 4, True),
    # Semester 8
    ("Investigación en Computación", 8, 3, False),
    ("Arte y Tecnología", 8, 3, False),
    ("Proyecto Preprofesional", 8, 8, False),
    # Semester 9
    ("Internet de las Cosas", 9, 4, False),
    ("Proyecto Final de Carrera - Trabajo de Investigación II", 9, 4, False),
    ("ELECTIVO2", 9, 4, True),
    ("ELECTIVO3", 9, 4, True),
    ("Evaluación Financiera de Proyectos", 9, 3, False),
    ("Ética y Tecnología", 9, 3, False),
    # Semester 10
    ("Proyecto Final de Carrera - Trabajo de Investigación III", 10, 4, False),
    ("ELECTIVO4", 10, 4, True),
    ("ELECTIVO5", 10, 4, True),
    ("ELECTIVO6", 10, 4, True),
    ("Estrategia y Organizaciones", 10, 3, False),
]

# ── Prerequisite definitions ──
# Format: (course_name, prerequisite_type, prerequisite_course_name_or_credits)
# For "course" type: value is the prerequisite course name
# For "credits" type: value is the minimum credits required
PREREQUISITES = [
    # Semester 2
    ("Álgebra Lineal", "course", "Cálculo de una variable"),
    ("Cálculo Vectorial", "course", "Cálculo de una variable"),
    ("Óptica y Ondas", "course", "Cálculo de una variable"),
    ("Matemáticas Discretas II", "course", "Matemáticas Discretas I"),
    ("Programación II", "course", "Programación I"),
    ("Laboratorio de Comunicación 2", "course", "Laboratorio de Comunicación 1"),
    # Semester 3
    ("Estadística y Probabilidades I", "course", "Cálculo de una variable"),
    ("Estadística y Probabilidades I", "course", "Programación I"),
    ("Ecuaciones Diferenciales", "course", "Cálculo Vectorial"),
    ("Programación III", "course", "Programación II"),
    ("Desarrollo Basado en Plataformas", "course", "Programación II"),
    ("Base de Datos I", "course", "Programación II"),
    ("Proyectos Interdisciplinarios 2", "course", "Proyectos Interdisciplinarios 1"),
    # Semester 4
    ("Métodos Numéricos", "course", "Programación I"),
    ("Métodos Numéricos", "course", "Álgebra Lineal"),
    ("Métodos Numéricos", "course", "Ecuaciones Diferenciales"),
    ("Algoritmos y Estructuras de Datos", "course", "Programación III"),
    ("Teoría de la Computación", "course", "Matemáticas Discretas II"),
    ("Teoría de la Computación", "course", "Programación III"),
    ("Cloud Computing", "course", "Desarrollo Basado en Plataformas"),
    ("Arquitectura de Computadoras", "course", "Matemáticas Discretas II"),
    # Semester 5
    ("Base de Datos II", "course", "Algoritmos y Estructuras de Datos"),
    ("Base de Datos II", "course", "Base de Datos I"),
    ("Compiladores", "course", "Teoría de la Computación"),
    ("Análisis y Diseño de Algoritmos", "course", "Algoritmos y Estructuras de Datos"),
    ("Ingeniería de Software", "course", "Cloud Computing"),
    ("Proyectos Interdisciplinarios 3", "course", "Proyectos Interdisciplinarios 2"),
    # Semester 6
    ("Estructura de Datos Avanzados", "course", "Algoritmos y Estructuras de Datos"),
    ("Sistemas Operativos", "course", "Arquitectura de Computadoras"),
    ("Programación Competitiva", "course", "Algoritmos y Estructuras de Datos"),
    ("Machine Learning", "course", "Programación II"),
    ("Machine Learning", "course", "Estadística y Probabilidades I"),
    ("Finanzas Empresariales", "course", "Empresa y Consumidor"),
    # Semester 7
    ("Computación Gráfica", "course", "Análisis y Diseño de Algoritmos"),
    ("Computación Gráfica", "course", "Óptica y Ondas"),
    ("Computación Paralela y Distribuida", "course", "Análisis y Diseño de Algoritmos"),
    ("Interacción Humano Computador", "course", "Programación II"),
    ("Interacción Humano Computador", "course", "Óptica y Ondas"),
    ("Redes y Comunicaciones", "course", "Sistemas Operativos"),
    # Semester 8
    ("Investigación en Computación", "course", "Análisis y Diseño de Algoritmos"),
    ("Proyecto Preprofesional", "credits", 100),
    # Semester 9
    ("Internet de las Cosas", "course", "Programación II"),
    ("Internet de las Cosas", "course", "Arquitectura de Computadoras"),
    ("Proyecto Final de Carrera - Trabajo de Investigación II", "credits", 130),
    ("Evaluación Financiera de Proyectos", "course", "Finanzas Empresariales"),
    # Semester 10
    ("Proyecto Final de Carrera - Trabajo de Investigación III", "course",
     "Proyecto Final de Carrera - Trabajo de Investigación II"),
    ("Estrategia y Organizaciones", "course", "Evaluación Financiera de Proyectos"),
]


def link_courses_to_db(db: Session, curriculum_courses: list[CurriculumCourse], university_id: int):
    """Try to match curriculum courses to existing Course records by partial name match."""
    db_courses = db.query(Course).filter(
        Course.university_id == university_id,
        Course.is_active == True
    ).all()

    # Build normalized name → course id map
    name_map = {}
    for c in db_courses:
        name_map[normalize_name(c.name)] = c.id

    linked = 0
    for cc in curriculum_courses:
        if cc.is_elective:
            continue
        norm = normalize_name(cc.course_name)
        # Try exact match first
        if norm in name_map:
            cc.linked_course_id = name_map[norm]
            linked += 1
            continue
        # Try partial match (curriculum name contained in DB name or vice versa)
        for db_norm, db_id in name_map.items():
            if norm in db_norm or db_norm in norm:
                cc.linked_course_id = db_id
                linked += 1
                break

    print(f"  Linked {linked}/{len([c for c in curriculum_courses if not c.is_elective])} courses to DB records")


def seed():
    db = SessionLocal()
    try:
        # Find UTEC university
        utec = db.query(University).filter(University.short_name == "UTEC").first()
        if not utec:
            print("ERROR: University 'UTEC' not found. Please import university data first.")
            return

        # Check if curriculum already exists
        existing = db.query(Curriculum).filter(Curriculum.code == "CS-2021").first()
        if existing:
            print(f"Curriculum CS-2021 already exists (id={existing.id}). Skipping seed.")
            return

        # Create curriculum
        curriculum = Curriculum(
            university_id=utec.id,
            name="Ciencia de la Computación 2021",
            code="CS-2021",
            year=2021,
            total_credits=176,
            total_semesters=10,
        )
        db.add(curriculum)
        db.flush()
        print(f"Created curriculum: {curriculum.name} (id={curriculum.id})")

        # Create courses
        name_to_course: dict[str, CurriculumCourse] = {}
        for course_name, semester, credits, is_elective in COURSES:
            cc = CurriculumCourse(
                curriculum_id=curriculum.id,
                course_name=course_name,
                semester=semester,
                credits=credits,
                is_elective=is_elective,
                elective_group="ELECTIVE" if is_elective else None,
            )
            db.add(cc)
            name_to_course[course_name] = cc

        db.flush()
        print(f"  Created {len(COURSES)} curriculum courses")

        # Create prerequisites
        prereq_count = 0
        for course_name, prereq_type, prereq_value in PREREQUISITES:
            cc = name_to_course.get(course_name)
            if not cc:
                print(f"  WARNING: Course '{course_name}' not found for prerequisite")
                continue

            if prereq_type == "course":
                prereq_cc = name_to_course.get(prereq_value)
                if not prereq_cc:
                    print(f"  WARNING: Prerequisite course '{prereq_value}' not found")
                    continue
                prereq = CurriculumPrerequisite(
                    curriculum_course_id=cc.id,
                    prerequisite_course_id=prereq_cc.id,
                    prerequisite_type="course",
                )
            elif prereq_type == "credits":
                prereq = CurriculumPrerequisite(
                    curriculum_course_id=cc.id,
                    prerequisite_course_id=None,
                    prerequisite_type="credits",
                    required_credits=prereq_value,
                )
            else:
                continue

            db.add(prereq)
            prereq_count += 1

        db.flush()
        print(f"  Created {prereq_count} prerequisite relationships")

        # Try to link to existing DB courses
        all_cc = list(name_to_course.values())
        link_courses_to_db(db, all_cc, utec.id)

        db.commit()
        print("Seed completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
