#!/usr/bin/env python3
"""
Railway Database Reset Script
This script provides options to reset the Railway database with different scopes.

Usage: 
  python reset_railway.py --complete                    # Full database reset
  python reset_railway.py --courses                     # Reset only course-related tables
  python reset_railway.py --complete --import <csv>     # Reset and import
  python reset_railway.py --courses --import <csv>      # Reset courses and import

Examples:
  python reset_railway.py --complete
  python reset_railway.py --courses --import Horarios252.csv --fast
  python reset_railway.py --complete --import Horarios252.csv --resume "Some Course"
"""

import sys
import os
import argparse
import subprocess

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables using flexible configuration
from app.utils.config import load_environment
load_environment()

from app.database.connection import SessionLocal

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../.env.local')

def get_database_connection():
    """Get database connection."""
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return None
    
    try:
        conn = psycopg2.connect(database_url)
        return conn
    except psycopg2.Error as e:
        print(f"❌ Database connection error: {e}")
        return None

def complete_reset():
    """Reset the entire Railway database by clearing all tables."""
    print("🚀 Connecting to Railway database...")
    
    conn = get_database_connection()
    if not conn:
        return False
    
    cursor = conn.cursor()
    
    try:
        print("✅ Connected to Railway database")
        
        # Disable foreign key constraints temporarily
        print("🔧 Disabling foreign key constraints...")
        cursor.execute("SET session_replication_role = replica;")
        
        # Get all table names (excluding system tables)
        cursor.execute("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename NOT LIKE 'pg_%' 
            AND tablename NOT LIKE 'sql_%'
            ORDER BY tablename;
        """)
        
        tables = cursor.fetchall()
        
        if not tables:
            print("⚠️  No tables found in the database")
            return True
        
        print(f"📋 Found {len(tables)} tables to clear:")
        for table in tables:
            print(f"  📄 {table[0]}")
        
        # Clear all tables
        print("\n🗑️  Clearing all table data...")
        
        for table in tables:
            table_name = table[0]
            try:
                cursor.execute(f"DELETE FROM {table_name};")
                
                # Get count to verify deletion
                cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
                count = cursor.fetchone()[0]
                
                print(f"  ✅ Cleared {table_name} (remaining records: {count})")
                
            except Exception as e:
                print(f"  ❌ Error clearing {table_name}: {e}")
                return False
        
        # Re-enable foreign key constraints
        print("\n🔧 Re-enabling foreign key constraints...")
        cursor.execute("SET session_replication_role = DEFAULT;")
        
        # Reset sequences (auto-increment counters)
        print("🔄 Resetting sequence counters...")
        cursor.execute("""
            SELECT sequence_name FROM information_schema.sequences 
            WHERE sequence_schema = 'public';
        """)
        
        sequences = cursor.fetchall()
        for seq in sequences:
            seq_name = seq[0]
            try:
                cursor.execute(f"ALTER SEQUENCE {seq_name} RESTART WITH 1;")
                print(f"  ✅ Reset sequence: {seq_name}")
            except Exception as e:
                print(f"  ⚠️  Could not reset sequence {seq_name}: {e}")
        
        # Commit changes
        conn.commit()
        
        print("\n📊 Verifying complete database reset...")
        
        # Verify all tables are empty
        all_empty = True
        for table in tables:
            table_name = table[0]
            cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
            count = cursor.fetchone()[0]
            
            if count > 0:
                print(f"  ❌ {table_name}: {count} records remaining")
                all_empty = False
            else:
                print(f"  ✅ {table_name}: 0 records")
        
        cursor.close()
        conn.close()
        
        if all_empty:
            print("\n🎉 Complete database reset successful!")
            return True
        else:
            print("\n❌ Some tables still contain data. Reset may have failed.")
            return False
            
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def selective_reset():
    """Reset only course-related tables (courses, sections, sessions)."""
    print("🚀 Connecting to Railway database...")
    
    conn = get_database_connection()
    if not conn:
        return False
    
    cursor = conn.cursor()
    
    try:
        print("✅ Connected to Railway database")
        
        # Define course-related tables in deletion order (respecting foreign keys)
        course_tables = [
            'sessions',      # Sessions depend on sections
            'sections',      # Sections depend on courses
            'courses'        # Courses can be deleted last
        ]
        
        print("📋 Course-related tables to clear:")
        for table in course_tables:
            print(f"  📄 {table}")
        
        # Disable foreign key constraints temporarily
        print("\n🔧 Disabling foreign key constraints...")
        cursor.execute("SET session_replication_role = replica;")
        
        # Clear course-related tables
        print("🗑️  Clearing course-related table data...")
        
        for table_name in course_tables:
            try:
                # Check if table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                    );
                """, (table_name,))
                
                if cursor.fetchone()[0]:
                    cursor.execute(f"DELETE FROM {table_name};")
                    
                    # Get count to verify deletion
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
                    count = cursor.fetchone()[0]
                    
                    print(f"  ✅ Cleared {table_name} (remaining records: {count})")
                else:
                    print(f"  ⚠️  Table {table_name} does not exist")
                
            except Exception as e:
                print(f"  ❌ Error clearing {table_name}: {e}")
                return False
        
        # Re-enable foreign key constraints
        print("\n🔧 Re-enabling foreign key constraints...")
        cursor.execute("SET session_replication_role = DEFAULT;")
        
        # Reset sequences for course-related tables
        print("🔄 Resetting course-related sequence counters...")
        course_sequences = ['courses_id_seq', 'sections_id_seq', 'sessions_id_seq']
        
        for seq_name in course_sequences:
            try:
                cursor.execute(f"ALTER SEQUENCE {seq_name} RESTART WITH 1;")
                print(f"  ✅ Reset sequence: {seq_name}")
            except Exception as e:
                print(f"  ⚠️  Could not reset sequence {seq_name}: {e}")
        
        # Commit changes
        conn.commit()
        
        print("\n📊 Verifying selective database reset...")
        
        # Verify course-related tables are empty
        all_empty = True
        for table_name in course_tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
                count = cursor.fetchone()[0]
                
                if count > 0:
                    print(f"  ❌ {table_name}: {count} records remaining")
                    all_empty = False
                else:
                    print(f"  ✅ {table_name}: 0 records")
            except Exception as e:
                print(f"  ⚠️  Could not verify {table_name}: {e}")
        
        cursor.close()
        conn.close()
        
        if all_empty:
            print("\n🎉 Selective database reset successful!")
            print("💡 Course-related tables cleared. Other data (users, schedules, etc.) preserved.")
            return True
        else:
            print("\n❌ Some course tables still contain data. Reset may have failed.")
            return False
            
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    print("🔄 Railway Database Reset Tool")
    print("=" * 50)
    
    print("\nReset Options:")
    print("1. � Reset Course Data - Delete courses, sections, and sessions (RECOMMENDED)")
    print("2. �️  Complete Reset - Delete ALL data from ALL tables")
    print("3. ❌ Cancel")
    
    while True:
        try:
            choice = input("\nEnter your choice (1-3): ").strip()
            
            if choice == "1":
                print("\n📚 COURSE DATA RESET: This will delete course-related data only.")
                print("Tables to be cleared: courses, sections, sessions")
                print("Tables preserved: users, schedules, collaborations, etc.")
                print("This will fix the duplicate sessions issue.")
                response = input("Continue? (yes/no): ")
                
                if response.lower() in ['yes', 'y']:
                    return selective_reset()
                else:
                    print("❌ Course reset cancelled")
                    return False
                    
            elif choice == "2":
                print("\n⚠️  COMPLETE RESET: This will DELETE ALL DATA from your Railway database!")
                print("This includes users, schedules, collaborations, and all other data.")
                response = input("Are you absolutely sure? Type 'DELETE ALL' to confirm: ")
                
                if response == "DELETE ALL":
                    return complete_reset()
                else:
                    print("❌ Complete reset cancelled")
                    return False
                    
            elif choice == "3":
                print("❌ Reset cancelled by user")
                return False
                
            else:
                print("❌ Invalid choice. Please enter 1, 2, or 3.")
                
        except KeyboardInterrupt:
            print("\n❌ Reset cancelled by user")
            return False

if __name__ == "__main__":
    success = main()
    
    if success:
        print("\n✅ Reset completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Reset failed or cancelled!")
        sys.exit(1)
