#!/usr/bin/env python3
"""
Standalone script to run database migrations
Usage: python run_migration.py
"""

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
from app.utils.config import load_environment
load_environment()

# Run the migration
from migrations.add_user_profile_fields import run_migration

if __name__ == "__main__":
    print("🔄 Running database migrations...")
    try:
        run_migration()
        print("✅ Migration completed successfully!")
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        sys.exit(1)