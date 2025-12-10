from app.database.connection import Base
from .base import BaseModel
from .university import University
from .user import User
from .course import Course
from .section import Section
from .session import Session
from .schedule import Schedule, ScheduleSession
from .collaboration import CollaborativeSession, SessionParticipant, ScheduleShare, ScheduleComparison, CollaborativeCourseSelection, GeneratedCollaborativeSchedule
from .friendship import FriendRequest, Friendship
from .email_verification import EmailVerification
from .academic_period import AcademicPeriod
from .enrollment_snapshot import EnrollmentSnapshot
from .import_log import ImportLog, ImportStatus
from .parser_configuration import ParserConfiguration

__all__ = [
    "Base",
    "BaseModel",
    "University",
    "User",
    "Course",
    "Section",
    "Session",
    "Schedule",
    "ScheduleSession",
    "CollaborativeSession",
    "SessionParticipant",
    "ScheduleShare",
    "ScheduleComparison",
    "CollaborativeCourseSelection",
    "GeneratedCollaborativeSchedule",
    "FriendRequest",
    "Friendship",
    "EmailVerification",
    "AcademicPeriod",
    "EnrollmentSnapshot",
    "ImportLog",
    "ImportStatus",
    "ParserConfiguration"
]