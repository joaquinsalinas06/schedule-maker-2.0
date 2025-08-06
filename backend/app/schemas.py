from typing import Optional, List, Dict
from pydantic import BaseModel, EmailStr
from datetime import datetime, time

# Base schemas
class BaseResponse(BaseModel):
    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

# University schemas
class UniversityBase(BaseModel):
    name: str
    short_name: str
    time_format: Optional[str] = "hours"

class UniversityCreate(UniversityBase):
    pass

class UniversityResponse(UniversityBase, BaseResponse):
    pass

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    nickname: Optional[str] = None
    profile_photo: Optional[str] = None
    description: Optional[str] = None
    university_id: int
    student_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False

class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    nickname: Optional[str] = None
    profile_photo: Optional[str] = None
    description: Optional[str] = None
    student_id: Optional[str] = None

class UserResponse(UserBase, BaseResponse):
    role: str
    is_verified: bool
    last_login: Optional[datetime] = None
    university: UniversityResponse

class Token(BaseModel):
    access_token: str
    token_type: str

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Course schemas
class CourseBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    department: Optional[str] = None

class CourseCreate(CourseBase):
    university_id: int

class CourseResponse(CourseBase, BaseResponse):
    university_id: int
    university: UniversityResponse

# Session schemas
class SessionBase(BaseModel):
    session_type: str
    day: str
    start_time: time
    end_time: time
    location: Optional[str] = None
    building: Optional[str] = None
    room: Optional[str] = None
    modality: Optional[str] = "Presencial"

class SessionResponse(SessionBase, BaseResponse):
    section_id: int

# Section schemas
class SectionBase(BaseModel):
    section_number: str
    capacity: Optional[int] = 30
    enrolled: Optional[int] = 0
    professor: Optional[str] = None

class SectionResponse(SectionBase, BaseResponse):
    course_id: int
    sessions: List[SessionResponse] = []

# Extended course response with sections
class CourseWithSections(CourseResponse):
    sections: List[SectionResponse] = []

# Schedule schemas
class ScheduleBase(BaseModel):
    name: str
    description: Optional[str] = None

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleResponse(ScheduleBase, BaseResponse):
    user_id: int
    is_favorite: bool

# Schedule generation and management schemas
class GenerateScheduleRequest(BaseModel):
    """Request to generate all possible schedule combinations from selected sections"""
    selected_sections: List[int]  # List of specific section IDs user wants to consider

class SaveScheduleRequest(BaseModel):
    """Request to save a schedule combination"""
    combination_id: str
    name: str
    description: Optional[str] = None
    combination: Optional[dict] = None  # Include the actual course data

# Search filters
class CourseSearchFilters(BaseModel):
    query: Optional[str] = None
    university: Optional[str] = None
    department: Optional[str] = None
    
# API Response wrapper
class APIResponse(BaseModel):
    data: Optional[dict] = None
    message: str = "Success"
    total: Optional[int] = None
    page: Optional[int] = None
    size: Optional[int] = None

# Collaboration schemas
class CollaborativeSessionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    max_participants: Optional[int] = 10
    duration_hours: Optional[int] = 24

class SessionParticipantResponse(BaseModel):
    user_id: int
    name: str
    email: str
    role: str
    joined_at: datetime
    
    class Config:
        from_attributes = True

class CollaborativeSessionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    session_code: str
    university_id: int
    created_by: int
    is_active: bool
    max_participants: int
    current_schedule_data: Optional[dict]
    expires_at: Optional[datetime]
    participants: List[SessionParticipantResponse] = []
    
    class Config:
        from_attributes = True

class JoinSessionRequest(BaseModel):
    session_code: str

# Enhanced Collaboration schemas
class CollaborativeCourseSelectionCreate(BaseModel):
    course_code: str
    course_name: str
    section_code: str
    professor: Optional[str] = None
    schedule_data: dict
    selection_type: str  # 'shared' or 'individual'
    shared_with_users: List[int] = []
    priority: Optional[int] = 1

class CollaborativeCourseSelectionResponse(BaseModel):
    id: int
    session_id: int
    user_id: int
    course_code: str
    course_name: str
    section_code: str
    professor: Optional[str]
    schedule_data: dict
    selection_type: str
    shared_with_users: List[int] = []
    priority: int
    added_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

class CollaborativeCourseSelectionUpdate(BaseModel):
    selection_type: Optional[str] = None
    shared_with_users: Optional[List[int]] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None

# Schedule Generation schemas
class GenerateSchedulesRequest(BaseModel):
    session_id: int
    course_selections: List[dict]
    personalized_schedules: Optional[List[dict]] = None

class GenerateSchedulesResponse(BaseModel):
    success: bool
    message: str
    schedules: List[dict]
    conflicts: Optional[List[dict]] = None

class GenerateCollaborativeScheduleRequest(BaseModel):
    optimization_preferences: Optional[dict] = {}
    conflict_resolution: Optional[str] = "priority"  # 'priority', 'manual', 'suggest_alternatives'

class GeneratedCollaborativeScheduleResponse(BaseModel):
    id: int
    session_id: int
    user_id: int
    schedule_data: dict
    shared_courses: List[dict]
    individual_courses: List[dict]
    conflicts: List[dict]
    generation_metadata: dict
    generated_at: datetime
    is_current: bool
    
    class Config:
        from_attributes = True

class ScheduleShareCreate(BaseModel):
    schedule_id: int
    # Simplified: always view-only, always public, no expiration
    
class ScheduleShareResponse(BaseModel):
    id: int
    schedule_id: int
    shared_by: int
    share_token: str
    created_at: datetime
    views_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

class SharedScheduleAccess(BaseModel):
    schedule: ScheduleResponse
    permissions: str
    shared_by: UserResponse
    
class ScheduleComparisonAdd(BaseModel):
    schedule_id: int

class ScheduleComparisonResponse(BaseModel):
    id: int
    session_id: int
    user_id: int
    schedule_id: int
    schedule: ScheduleResponse
    user: UserResponse
    added_at: datetime
    
    class Config:
        from_attributes = True


# WebSocket message schemas
class WebSocketMessage(BaseModel):
    type: str
    data: Optional[dict] = None
    user_id: Optional[int] = None
    timestamp: Optional[str] = None

class ScheduleUpdateMessage(BaseModel):
    type: str = "schedule_update"
    data: dict
    updated_by: int
    timestamp: str

class CourseActionMessage(BaseModel):
    type: str  # "course_added" or "course_removed"
    data: Optional[dict] = None
    course_id: Optional[int] = None
    user_id: int
    timestamp: str

# CSV Import schemas
class CSVImportStats(BaseModel):
    courses_processed: int
    sections_created: int
    sessions_created: int
    errors: List[str]
    warnings: List[str]
    skipped_courses: List[str]

class CSVImportResponse(BaseModel):
    success: bool
    message: str
    stats: CSVImportStats

class CSVAnalysisData(BaseModel):
    total_records: int
    unique_courses: int
    departments: Dict[str, int]
    session_types: Dict[str, int]
    modalities: Dict[str, int]
    invalid_schedules: int
    valid_schedules: int

class CSVAnalysisResponse(BaseModel):
    success: bool
    analysis: Optional[CSVAnalysisData] = None
    error: Optional[str] = None

# Friend request schemas
class FriendRequestCreate(BaseModel):
    receiver_id: int
    message: Optional[str] = None