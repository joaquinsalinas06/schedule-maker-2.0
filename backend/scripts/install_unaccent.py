#!/usr/bin/env python3
"""
Script to install PostgreSQL unaccent extension for better search functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import SessionLocal, engine
from sqlalchemy import text

def install_unaccent_extension():
    """Install the unaccent extension in PostgreSQL"""
    print("Installing PostgreSQL unaccent extension...")
    
    try:
        db = SessionLocal()
        
        # Check if extension is already installed
        result = db.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'unaccent'")).fetchone()
        
        if result:
            print("✓ unaccent extension is already installed")
            return True
        
        # Install the extension
        db.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))
        db.commit()
        
        # Verify installation
        result = db.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'unaccent'")).fetchone()
        
        if result:
            print("✓ unaccent extension installed successfully")
            
            # Test the function
            test_result = db.execute(text("SELECT unaccent('Análisis de Información')")).fetchone()
            print(f"✓ Test: unaccent('Análisis de Información') = '{test_result[0]}'")
            
            return True
        else:
            print("❌ Failed to install unaccent extension")
            return False
            
    except Exception as e:
        print(f"❌ Error installing unaccent extension: {str(e)}")
        print("Note: This might be a permissions issue or the extension might not be available")
        print("The search functionality will still work without this extension, but with reduced accent handling")
        return False
    finally:
        db.close()

def main():
    """Main function"""
    print("=== PostgreSQL unaccent Extension Installer ===")
    
    success = install_unaccent_extension()
    
    if success:
        print("\n✅ Setup complete! Search will now handle Spanish accents better.")
    else:
        print("\n⚠️  Extension installation failed, but search will still work with basic functionality.")
        print("You can continue using the application normally.")

if __name__ == "__main__":
    main()