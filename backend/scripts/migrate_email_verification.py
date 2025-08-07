"""
Database migration script for Email Verification feature
Run this script after setting up your email configuration to create the email_verifications table.
"""

import sys
import os
from pathlib import Path

# Add the app directory to Python path
app_dir = Path(__file__).parent.parent / "app"
sys.path.insert(0, str(app_dir))

from app.database.connection import get_database_url
from app.models import Base, EmailVerification
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_email_verification_table():
    """Create the email_verifications table."""
    try:
        # Get database URL
        database_url = get_database_url()
        logger.info(f"Connecting to database...")
        
        # Create engine
        engine = create_engine(database_url)
        
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            logger.info("✅ Database connection successful")
        
        # Create the email_verifications table
        logger.info("Creating email_verifications table...")
        EmailVerification.__table__.create(engine, checkfirst=True)
        logger.info("✅ email_verifications table created successfully")
        
        # Verify table was created
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'email_verifications'
                ORDER BY ordinal_position
            """))
            columns = result.fetchall()
            
            if columns:
                logger.info("📋 Table structure:")
                for col_name, col_type in columns:
                    logger.info(f"   • {col_name}: {col_type}")
            else:
                logger.warning("⚠️  Could not verify table structure")
        
        logger.info("🎉 Email verification table setup complete!")
        logger.info("📧 You can now use the email verification endpoints:")
        logger.info("   • POST /api/auth/send-verification")
        logger.info("   • POST /api/auth/verify-email") 
        logger.info("   • POST /api/auth/resend-verification")
        logger.info("   • GET /api/auth/verification-status/{email}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating email verification table: {str(e)}")
        return False

def main():
    """Main migration function."""
    logger.info("🚀 Starting email verification migration...")
    
    # Check if environment variables are set
    logger.info("🔍 Checking email configuration...")
    
    from app.utils.config import settings
    
    required_email_vars = {
        "SMTP_SERVER": settings.SMTP_SERVER,
        "SMTP_USERNAME": settings.SMTP_USERNAME, 
        "SMTP_PASSWORD": settings.SMTP_PASSWORD,
        "FROM_EMAIL": settings.FROM_EMAIL
    }
    
    missing_vars = [var for var, value in required_email_vars.items() if not value]
    
    if missing_vars:
        logger.warning("⚠️  Missing email configuration variables:")
        for var in missing_vars:
            logger.warning(f"   • {var}")
        logger.warning("📝 Please update your .env file with email settings")
        logger.warning("📋 See .env.example for required email configuration")
        print()
        proceed = input("Continue with database migration anyway? (y/N): ").lower().strip()
        if proceed != 'y':
            logger.info("Migration cancelled.")
            return
    else:
        logger.info("✅ Email configuration looks good!")
    
    # Create the table
    success = create_email_verification_table()
    
    if success:
        logger.info("\n🎯 Next steps:")
        logger.info("1. Configure your email settings in .env if not done already")
        logger.info("2. Test the email verification endpoints")
        logger.info("3. Update your frontend to use email verification flow")
        logger.info("4. Restart your FastAPI server to load the new endpoints")
    else:
        logger.error("\n❌ Migration failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
