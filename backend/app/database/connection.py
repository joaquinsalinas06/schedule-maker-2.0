from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

print("DEBUG: Checking for DATABASE_URL...")
DATABASE_URL = os.getenv("DATABASE_URL")
print(f"DEBUG: DATABASE_URL value: {DATABASE_URL}")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found!")
    print("Available environment variables:")
    for key in sorted(os.environ.keys()):
        print(f"  {key}={os.environ[key][:50]}...")
    raise ValueError("DATABASE_URL environment variable is required")
else:
    print("SUCCESS: DATABASE_URL found!")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()