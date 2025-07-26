from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models import University
from app.schemas import UniversityCreate, UniversityResponse, APIResponse
from app.utils.dependencies import get_current_active_user

router = APIRouter(prefix="/api/universities", tags=["universities"])

@router.get("/", response_model=List[UniversityResponse])
def get_universities(db: Session = Depends(get_db)):
    universities = db.query(University).filter(University.is_active == True).all()
    return universities

@router.get("/{university_id}", response_model=UniversityResponse)
def get_university(university_id: int, db: Session = Depends(get_db)):
    university = db.query(University).filter(
        University.id == university_id,
        University.is_active == True
    ).first()
    
    if not university:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="University not found"
        )
    
    return university

@router.post("/", response_model=APIResponse)
def create_university(
    university: UniversityCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    # Only admins can create universities
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Check if university already exists
    existing = db.query(University).filter(
        University.short_name == university.short_name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="University with this short name already exists"
        )
    
    db_university = University(**university.dict())
    db.add(db_university)
    db.commit()
    db.refresh(db_university)
    
    return APIResponse(
        data={"university_id": db_university.id},
        message="University created successfully"
    )