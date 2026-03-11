import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from collections import defaultdict

# Add backend to path
sys.path.append(r"c:\Users\Joaquin Salinas\Desktop\schedule-maker-2.0\backend")

from app.models.course import Course
from app.models.section import Section
from app.models.session import Session as SessionModel
from scripts.csv_import import CSVImporter, CourseImportData, SectionImportData, SessionImportData

database_url = "postgresql://postgres:bcAiqzzYDjvddlQhtktNrVWnmNxebkYU@caboose.proxy.rlwy.net:22932/railway"
engine = create_engine(database_url)
Session = sessionmaker(bind=engine)
db = Session()

university_id = 1 # UTEC

def analyze_deep_preview(courses_data, university_id):
    # Fetch all existing active courses
    existing_courses = db.query(Course).filter(Course.university_id == university_id, Course.is_active == True).all()
    existing_map = {c.code: c for c in existing_courses}
    
    course_ids = [c.id for c in existing_courses]
    
    # Fetch sections and sessions in batch to avoid N+1
    all_sections = db.query(Section).filter(Section.course_id.in_(course_ids), Section.is_active == True).all()
    all_sessions = db.query(SessionModel).filter(SessionModel.section_id.in_([s.id for s in all_sections]), SessionModel.is_active == True).all()
    
    # Build maps
    sections_map = defaultdict(list)
    for s in all_sections:
        sections_map[s.course_id].append(s)
        
    sessions_map = defaultdict(list)
    for sess in all_sessions:
        sessions_map[sess.section_id].append(sess)
        
    def compare_course(new_c, old_c):
        """Compare parsed data with DB model. Returns list of change types."""
        diffs = []
        if new_c.name != old_c.name: diffs.append("name")
        if new_c.department != old_c.department: diffs.append("dept")
        
        # Compare sections
        old_sects = sections_map.get(old_c.id, [])
        old_sects_by_num = {s.section_number: s for s in old_sects}
        new_sects_by_num = {s.section_number: s for s in new_c.sections}
        
        if set(old_sects_by_num.keys()) != set(new_sects_by_num.keys()):
            diffs.append("sections_count")
            return diffs # structural change
            
        for num, old_s in old_sects_by_num.items():
            new_s = new_sects_by_num[num]
            if old_s.professor != new_s.professor: diffs.append(f"sect_{num}_prof")
            if old_s.capacity != new_s.capacity: diffs.append(f"sect_{num}_cap")
            if old_s.enrolled != new_s.enrolled: diffs.append(f"sect_{num}_enr")
            
            # Compare sessions
            old_sessions = sessions_map.get(old_s.id, [])
            # ... and so on ...
            if len(old_sessions) != len(new_s.sessions):
                diffs.append(f"sect_{num}_sessions")
                return diffs
        
        return diffs

    added_count = 0
    updated_count = 0
    unchanged_count = 0
    changed_courses_details = []

    for new_c in courses_data:
        old_c = existing_map.get(new_c.code)
        if not old_c:
            added_count += 1
        else:
            diffs = compare_course(new_c, old_c)
            if diffs:
                updated_count += 1
                changed_courses_details.append((new_c, diffs))
            else:
                unchanged_count += 1
                
    return added_count, updated_count, unchanged_count, changed_courses_details

# Load file and parse
file_path = r"c:\Users\Joaquin Salinas\Desktop\schedule-maker-2.0\Consulta_Horario-202210604(3).xlsx"
with open(file_path, "rb") as f:
    file_bytes = f.read()
    
# Manual imitation of parser
import pandas as pd
import tempfile
df = pd.read_excel(file_path) # With the new fix applied it would find header
# Let's just use CSVImporter with the actual Excel->CSV logic
# ... skip it, just trust the previous fix for header ... 
# I'll manually skip for this test
df = df.iloc[11:] # assume approx skip
df.columns = df.iloc[0]
df = df.iloc[1:]

csv_tmp = tempfile.NamedTemporaryFile(suffix='.csv', delete=False, mode='w', newline='', encoding='utf-8')
df.to_csv(csv_tmp.name, index=False, encoding='utf-8')
csv_tmp.close()

importer = CSVImporter(db)
courses_data = importer.parse_csv_file(csv_tmp.name)

added, updated, unchanged, changes = analyze_deep_preview(courses_data, university_id)

print(f"Added courses: {added}")
print(f"Courses with changes: {updated}")
print(f"Unchanged courses: {unchanged}")
print("\nFirst 10 changed courses:")
for c, d in changes[:10]:
    print(f"- {c.code}: {c.name} ({', '.join(d)})")

db.close()
os.unlink(csv_tmp.name)
