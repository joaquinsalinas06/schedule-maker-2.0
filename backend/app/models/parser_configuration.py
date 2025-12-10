from sqlalchemy import Column, String, Integer, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from .base import BaseModel

class ParserConfiguration(BaseModel):
    """
    Store university-specific parsing rules

    Allows each university to have custom parsing logic and configuration
    without changing code.
    """
    __tablename__ = "parser_configurations"

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False, unique=True)

    # Parser selection
    parser_type = Column(String(50), nullable=False)  # 'csv', 'pdf', 'html_selenium', 'api'
    parser_class = Column(String(100), nullable=False)  # 'UTECCSVParser', 'WinnerPDFParser', etc.

    # Configuration JSON (university-specific parsing rules)
    config_json = Column(Text, nullable=False)  # JSON with column mappings, regex patterns, etc.

    # Automation settings
    supports_automated_scraping = Column(Boolean, default=False)
    scrape_url = Column(String(500), nullable=True)  # URL for automated scraping
    scrape_frequency_hours = Column(Integer, default=1)  # How often to scrape (in hours)

    # Relationships
    university = relationship("University", back_populates="parser_configuration")
