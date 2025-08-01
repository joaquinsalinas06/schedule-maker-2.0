#!/usr/bin/env python3
"""
CSV Import Script for Schedule Maker 2.0
Usage: python backend/scripts/import_csv.py <csv_file_path> [university_id]
"""

import sys
import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import SessionLocal
from app.services.csv_import_service import CSVImportService
from app.repositories.university_repository import UniversityRepository


class MockUploadFile:
    """Mock UploadFile for script usage"""
    def __init__(self, file_path: str):
        self.filename = os.path.basename(file_path)
        self.file_path = file_path
    
    async def read(self):
        with open(self.file_path, 'rb') as f:
            return f.read()


async def import_csv_file(csv_file_path: str, university_id: int = 1):
    """Import CSV file using the CSV import service"""
    
    # Validate file exists
    if not os.path.exists(csv_file_path):
        return False
    
    # Validate file extension
    if not csv_file_path.lower().endswith('.csv'):
        return False
    
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Verify university exists
        university_repo = UniversityRepository(db)
        university = university_repo.get_by_id(university_id)
        
        if not university:
            return False
        
        
        # Create mock upload file
        mock_file = MockUploadFile(csv_file_path)
        
        # Import CSV
        import_service = CSVImportService(db)
        result = await import_service.import_csv_file(mock_file, university_id)
        
        # Display results handled by service
        pass
        
        return result['success']
        
    except Exception as e:
        return False
    finally:
        db.close()


def main():
    """Main function"""
    if len(sys.argv) < 2:
        sys.exit(1)
    
    csv_file_path = sys.argv[1]
    university_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    
    
    # Run the async import
    success = asyncio.run(import_csv_file(csv_file_path, university_id))
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()