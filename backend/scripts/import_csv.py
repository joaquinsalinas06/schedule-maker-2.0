#!/usr/bin/env python3
"""
CSV Import Script for Schedule Maker 2.0
Usage: python backend/scripts/import_csv.py <csv_file_path> [university_id]
"""

import sys
import os
import asyncio
from pathlib import Path

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
        print(f"❌ Error: File {csv_file_path} not found")
        return False
    
    # Validate file extension
    if not csv_file_path.lower().endswith('.csv'):
        print(f"❌ Error: File must be a CSV file")
        return False
    
    print(f"🔄 Starting CSV import...")
    print(f"   File: {csv_file_path}")
    print(f"   University ID: {university_id}")
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Verify university exists
        university_repo = UniversityRepository(db)
        university = university_repo.get_by_id(university_id)
        
        if not university:
            print(f"❌ Error: University with ID {university_id} not found")
            print("Available universities:")
            universities = university_repo.get_all()
            for uni in universities:
                print(f"   ID {uni.id}: {uni.name} ({uni.short_name})")
            return False
        
        print(f"✓ University: {university.name} ({university.short_name})")
        
        # Create mock upload file
        mock_file = MockUploadFile(csv_file_path)
        
        # Import CSV
        import_service = CSVImportService(db)
        result = await import_service.import_csv_file(mock_file, university_id)
        
        # Display results
        if result['success']:
            print("\n✅ Import completed successfully!")
            stats = result['stats']
            print(f"   Courses processed: {stats['courses_processed']}")
            print(f"   Sections created: {stats['sections_created']}")
            print(f"   Sessions created: {stats['sessions_created']}")
            
            if stats['skipped_courses']:
                print(f"   Skipped courses: {len(stats['skipped_courses'])}")
                for course in stats['skipped_courses'][:5]:  # Show first 5
                    print(f"     - {course}")
                if len(stats['skipped_courses']) > 5:
                    print(f"     ... and {len(stats['skipped_courses']) - 5} more")
            
            if stats['warnings']:
                print(f"   Warnings: {len(stats['warnings'])}")
                for warning in stats['warnings'][:3]:  # Show first 3
                    print(f"     - {warning}")
                if len(stats['warnings']) > 3:
                    print(f"     ... and {len(stats['warnings']) - 3} more")
            
            if stats['errors']:
                print(f"   Errors: {len(stats['errors'])}")
                for error in stats['errors'][:3]:  # Show first 3
                    print(f"     - {error}")
                if len(stats['errors']) > 3:
                    print(f"     ... and {len(stats['errors']) - 3} more")
        else:
            print(f"\n❌ Import failed: {result['message']}")
            if 'stats' in result and result['stats']['errors']:
                print("Errors:")
                for error in result['stats']['errors']:
                    print(f"   - {error}")
        
        return result['success']
        
    except Exception as e:
        print(f"❌ Critical error: {str(e)}")
        return False
    finally:
        db.close()


def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python backend/scripts/import_csv.py <csv_file_path> [university_id]")
        print("Example: python backend/scripts/import_csv.py courses.csv 1")
        sys.exit(1)
    
    csv_file_path = sys.argv[1]
    university_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    
    print("=== Schedule Maker 2.0 CSV Import ===")
    
    # Run the async import
    success = asyncio.run(import_csv_file(csv_file_path, university_id))
    
    if success:
        print("\n🎉 CSV import completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 CSV import failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()