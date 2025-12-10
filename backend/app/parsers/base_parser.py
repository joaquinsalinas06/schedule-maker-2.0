from abc import ABC, abstractmethod
from typing import List, Dict, Any
from dataclasses import dataclass
from datetime import time

@dataclass
class ParsedSession:
    """Parsed session data structure"""
    session_type: str
    day: str
    start_time: time
    end_time: time
    location: str
    building: str
    room: str
    modality: str
    frequency: str

@dataclass
class ParsedSection:
    """Parsed section data structure"""
    section_number: str
    capacity: int
    enrolled: int
    waitlisted: int
    professor: str
    professor_email: str
    sessions: List[ParsedSession]

@dataclass
class ParsedCourse:
    """Parsed course data structure"""
    code: str
    name: str
    department: str
    sections: List[ParsedSection]

class BaseParser(ABC):
    """
    Abstract base parser for different university data formats

    Each university can have its own parser implementation that inherits from this class.
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize parser with university-specific configuration

        Args:
            config: Dictionary from parser_configurations.config_json
        """
        self.config = config

    @abstractmethod
    def parse(self, file_content: bytes, filename: str) -> List[ParsedCourse]:
        """
        Parse file content and return structured course data

        Args:
            file_content: Raw file bytes
            filename: Original filename (for format detection)

        Returns:
            List of ParsedCourse objects

        Raises:
            ParserException: If parsing fails
        """
        pass

    @abstractmethod
    def validate_format(self, file_content: bytes, filename: str) -> bool:
        """
        Check if this parser can handle the given file

        Args:
            file_content: Raw file bytes
            filename: Original filename

        Returns:
            True if file format is supported by this parser
        """
        pass

    def extract_department(self, course_code: str) -> str:
        """
        Extract department from course code (e.g., 'CS' from 'CS101')

        Default implementation uses regex. Override if needed.
        """
        import re
        match = re.match(r'^([A-Z]{2,4})', course_code)
        return match.group(1) if match else "UNKNOWN"


class ParserException(Exception):
    """Custom exception for parser errors"""
    pass
