"""
Migration: Add user profile fields
Adds nickname, profile_photo, and description columns to users table
"""

from sqlalchemy import text
from app.database.connection import engine


def run_migration():
    """Add missing user profile columns"""
    
    migrations = [
        # Add nickname column
        """
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);
        """,
        
        # Add profile_photo column
        """
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(500);
        """,
        
        # Add description column
        """
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS description TEXT;
        """
    ]
    
    with engine.connect() as connection:
        with connection.begin():
            for migration_sql in migrations:
                print(f"Executing: {migration_sql.strip()}")
                connection.execute(text(migration_sql))
        
        print("✅ Successfully added user profile fields")


if __name__ == "__main__":
    run_migration()