import io
import re
import pdfplumber
from typing import List, Dict

class PDFParserService:
    @staticmethod
    def parse_carga_habil(file_bytes: bytes) -> Dict[str, List[Dict[str, str]]]:
        """
        Parses a 'Carga Habil' PDF file using regex on raw text for massive speedups,
        and extracts mandatory and elective courses including their codes, names, and types.
        """
        mandatory_courses: Dict[str, Dict[str, str]] = {}
        elective_courses: Dict[str, Dict[str, str]] = {}
        
        # Regex pattern to match typical course rows.
        # Example line: "CS4016 Computación Paralela 4.00 0.00 0.00 Obligatorio"
        # Group 1: Code (e.g. CS4016, 2-2 chars+digits minimum typically)
        # Group 2: Name (text until we hit credits/version numbers)
        # Group 3: Type (Obligatorio|Electivo)
        
        # A robust regex for common UTEC syllabus formats:
        # ^([A-Z]{2,3}[0-9]{4})\s+(.+?)\s+(?:\d+\.\d{2}\s+)+.*?(Obligatorio|Electivo)$
        pattern = re.compile(r'^([A-Z]{2,3}[0-9]{4})\s+(.+?)\s+(?:\d+\.\d{2}\s+)+.*?(Obligatorio|Electivo)$', re.IGNORECASE)
        
        # For lines that might break strangely, a more forgiving fallback:
        # Starts with Course Code -> Has some text for name -> ends with Obligatorio/Electivo
        fallback_pattern = re.compile(r'^([A-Z]{2,3}[0-9]{4})\s+(.+?)(?:Obligatorio|Electivo)', re.IGNORECASE)

        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text:
                    continue
                
                for line in text.split('\n'):
                    line = line.strip()
                    if not line:
                        continue
                        
                    # Fast check if it even looks like a course row to avoid regex overhead on every line
                    if not ("bligatorio" in line or "lectivo" in line):
                        continue
                        
                    match = pattern.match(line)
                    course_code = None
                    course_name = None
                    course_type_str = None
                    
                    if match:
                        course_code = match.group(1).upper()
                        course_name = match.group(2).strip()
                        course_type_str = match.group(3).lower()
                    else:
                        # Try a looser match if the credits format is weird
                        loose_match = re.search(r'([A-Z]{2,3}[0-9]{4})\s+(.+?)\s+.*?(Obligatorio|Electivo)', line, re.IGNORECASE)
                        if loose_match:
                            course_code = loose_match.group(1).upper()
                            course_name = loose_match.group(2).strip()
                            course_type_str = loose_match.group(3).lower()
                            
                    if course_code and course_name and course_type_str:
                        # Clean up trailing numbers or weird stops in name if regex got greedy
                        course_name = re.sub(r'\s+\d+(\.\d+)?.*$', '', course_name).strip()
                        
                        course_data = {
                            "code": course_code,
                            "name": course_name,
                            "type": "Obligatorio" if "obligatorio" in course_type_str else "Electivo"
                        }
                        
                        if "obligatorio" in course_type_str:
                            mandatory_courses[course_code] = course_data
                        elif "electivo" in course_type_str:
                            elective_courses[course_code] = course_data

        return {
            "mandatory": list(mandatory_courses.values()),
            "electives": list(elective_courses.values())
        }
