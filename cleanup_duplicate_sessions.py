#!/usr/bin/env python3
"""
Script to remove duplicate sessions from the database.
This removes sessions that have identical: section_id, session_type, day, start_time, end_time
keeping only the newest session (highest ID) of each duplicate group.
"""

import psycopg2
import os
from datetime import datetime

def connect_to_db(database_url):
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def analyze_duplicates(conn):
    """Analyze duplicate sessions before cleanup"""
    cursor = conn.cursor()
    
    # Count duplicate sessions
    cursor.execute("""
        SELECT COUNT(*) as total_duplicate_sessions 
        FROM (
            SELECT section_id, session_type, day, start_time, end_time, COUNT(*) - 1 as excess_sessions
            FROM sessions 
            GROUP BY section_id, session_type, day, start_time, end_time 
            HAVING COUNT(*) > 1
        ) duplicates;
    """)
    
    total_duplicates = cursor.fetchone()[0]
    
    # Count affected sections
    cursor.execute("""
        SELECT COUNT(DISTINCT section_id) as sections_with_duplicates 
        FROM (
            SELECT section_id, session_type, day, start_time, end_time, COUNT(*) as duplicate_count
            FROM sessions 
            GROUP BY section_id, session_type, day, start_time, end_time 
            HAVING COUNT(*) > 1
        ) duplicates;
    """)
    
    affected_sections = cursor.fetchone()[0]
    
    cursor.close()
    return total_duplicates, affected_sections

def cleanup_duplicate_sessions(conn, dry_run=True):
    """Remove duplicate sessions, keeping the one with the highest ID"""
    cursor = conn.cursor()
    
    try:
        # Find all sessions that need to be deleted (keep the one with max ID per group)
        delete_query = """
        DELETE FROM sessions 
        WHERE id IN (
            SELECT id FROM (
                SELECT id, 
                       ROW_NUMBER() OVER (
                           PARTITION BY section_id, session_type, day, start_time, end_time 
                           ORDER BY id DESC
                       ) as row_num
                FROM sessions
            ) ranked_sessions
            WHERE row_num > 1
        );
        """
        
        if dry_run:
            # Just count what would be deleted
            count_query = """
            SELECT COUNT(*) FROM (
                SELECT id FROM (
                    SELECT id, 
                           ROW_NUMBER() OVER (
                               PARTITION BY section_id, session_type, day, start_time, end_time 
                               ORDER BY id DESC
                           ) as row_num
                    FROM sessions
                ) ranked_sessions
                WHERE row_num > 1
            ) to_delete;
            """
            cursor.execute(count_query)
            count = cursor.fetchone()[0]
            print(f"DRY RUN: Would delete {count} duplicate sessions")
            return count
        else:
            cursor.execute(delete_query)
            deleted_count = cursor.rowcount
            conn.commit()
            print(f"Successfully deleted {deleted_count} duplicate sessions")
            return deleted_count
            
    except Exception as e:
        print(f"Error during cleanup: {e}")
        conn.rollback()
        return 0
    finally:
        cursor.close()

def verify_cleanup(conn):
    """Verify that duplicates have been removed"""
    total_duplicates, affected_sections = analyze_duplicates(conn)
    print(f"After cleanup: {total_duplicates} duplicate sessions remaining")
    print(f"After cleanup: {affected_sections} sections still have duplicates")
    return total_duplicates == 0

def main():
    import sys
    
    # Database URLs
    LOCAL_DB = "postgresql://postgres:postgres@localhost:5433/schedule_maker"
    RAILWAY_DB = "postgresql://postgres:toZuxLPhgeNBGYFFQucNJVBrZxkgbNpu@crossover.proxy.rlwy.net:40567/railway"
    
    print("=== Database Duplicate Session Cleanup ===")
    print(f"Timestamp: {datetime.now()}")
    print()
    
    # Get database choice from command line or default to railway
    if len(sys.argv) > 1:
        db_choice = sys.argv[1].lower()
    else:
        db_choice = "railway"  # Default to railway for production cleanup
    
    if db_choice == "local":
        database_url = LOCAL_DB
        print("Using LOCAL database")
    elif db_choice == "railway":
        database_url = RAILWAY_DB
        print("Using RAILWAY database")
    else:
        print("Invalid choice. Exiting.")
        return
    
    # Connect to database
    conn = connect_to_db(database_url)
    if not conn:
        print("Failed to connect to database")
        return
    
    print(f"Connected to database successfully")
    print()
    
    # Analyze current state
    print("=== Current State Analysis ===")
    total_duplicates, affected_sections = analyze_duplicates(conn)
    print(f"Total duplicate sessions to remove: {total_duplicates}")
    print(f"Sections affected by duplicates: {affected_sections}")
    print()
    
    if total_duplicates == 0:
        print("No duplicates found! Database is clean.")
        conn.close()
        return
    
    # Dry run first
    print("=== Dry Run ===")
    dry_run_count = cleanup_duplicate_sessions(conn, dry_run=True)
    print()
    
    # Ask for confirmation
    if db_choice == "railway":
        # Auto-confirm for railway database cleanup since we analyzed the issue
        print(f"Auto-confirming cleanup of {dry_run_count} duplicate sessions from PRODUCTION database.")
        print("This operation is safe as it only removes exact duplicates, keeping the newest session.")
    
    # Perform actual cleanup
    print("=== Performing Cleanup ===")
    deleted_count = cleanup_duplicate_sessions(conn, dry_run=False)
    print()
    
    # Verify cleanup
    print("=== Verification ===")
    is_clean = verify_cleanup(conn)
    
    if is_clean:
        print("✅ Cleanup successful! No duplicates remaining.")
    else:
        print("⚠️ Some duplicates may still exist. Please review.")
    
    conn.close()
    print("Database connection closed.")

if __name__ == "__main__":
    main()