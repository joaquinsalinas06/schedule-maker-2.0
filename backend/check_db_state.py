import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

database_url = "postgresql://postgres:bcAiqzzYDjvddlQhtktNrVWnmNxebkYU@caboose.proxy.rlwy.net:22932/railway"
engine = create_engine(database_url)
Session = sessionmaker(bind=engine)
db = Session()

# Check Finanzas Empresariales
res = db.execute(text("""
    SELECT c.name, s.section_number, count(sess.id) as sessions_count
    FROM courses c
    JOIN sections s ON s.course_id = c.id
    JOIN sessions sess ON sess.section_id = s.id
    WHERE c.name ILIKE '%Finanzas Empresariales%' AND c.is_active = true AND s.is_active = true AND sess.is_active = true
    GROUP BY c.name, s.section_number
""")).fetchall()

print("Current active sections in DB for Finanzas Empresariales:")
for row in res:
    print(f"Course: {row[0]}, Section: {row[1]}, Sessions: {row[2]}")

db.close()
