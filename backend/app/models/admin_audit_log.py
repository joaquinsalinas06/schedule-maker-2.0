from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from .base import BaseModel


class AdminAuditLog(BaseModel):
    __tablename__ = "admin_audit_logs"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    file_name = Column(String(255), nullable=True)
    status = Column(String(20), default="success")
    executed_at = Column(DateTime, default=func.now())
