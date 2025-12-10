from abc import ABC, abstractmethod
from typing import List, Dict, Any
from dataclasses import dataclass
from datetime import time


@dataclass
class ScrapedSession:
    """Scraped session data structure"""
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
class ScrapedSection:
    """Scraped section data structure"""
    section_number: str
    capacity: int
    enrolled: int
    waitlisted: int
    professor: str
    professor_email: str
    sessions: List[ScrapedSession]


@dataclass
class ScrapedCourse:
    """Scraped course data structure"""
    code: str
    name: str
    department: str
    sections: List[ScrapedSection]


class BaseWebScraper(ABC):
    """
    Abstract base scraper for university enrollment websites

    Each university has its own scraper implementation that inherits from this class.
    Scrapers use Selenium to navigate websites and extract enrollment data.
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize scraper with university-specific configuration

        Args:
            config: Dictionary from scraper_configurations.config_json
                Expected keys:
                - url: str - Base URL to scrape
                - login_required: bool - Whether authentication is needed
                - login_url: str - Login page URL (if required)
                - username: str - Login username (if required)
                - password: str - Login password (if required)
                - headless: bool - Run browser in headless mode (default: True)
                - timeout: int - Page load timeout in seconds (default: 30)
        """
        self.config = config
        self.url = config.get('url')
        self.headless = config.get('headless', True)
        self.timeout = config.get('timeout', 30)

    @abstractmethod
    def scrape(self) -> List[ScrapedCourse]:
        """
        Scrape enrollment data from university website

        Returns:
            List of ScrapedCourse objects with current enrollment data

        Raises:
            ScraperException: If scraping fails
        """
        pass

    @abstractmethod
    def validate_page(self) -> bool:
        """
        Validate that the scraper can access the target page

        Returns:
            True if page is accessible and contains expected elements

        Raises:
            ScraperException: If validation fails
        """
        pass

    def setup_driver(self):
        """
        Setup Selenium WebDriver with appropriate options

        Override this method to customize driver configuration
        """
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service
        from webdriver_manager.chrome import ChromeDriverManager

        options = Options()

        if self.headless:
            options.add_argument('--headless')
            options.add_argument('--disable-gpu')

        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--window-size=1920,1080')

        # Disable unnecessary features for performance
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-logging')
        options.add_argument('--disable-notifications')

        # User agent to avoid detection
        options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        driver.set_page_load_timeout(self.timeout)

        return driver

    def extract_department(self, course_code: str) -> str:
        """
        Extract department from course code (e.g., 'CS' from 'CS101')

        Default implementation uses regex. Override if needed.
        """
        import re
        match = re.match(r'^([A-Z]{2,4})', course_code)
        return match.group(1) if match else "UNKNOWN"


class ScraperException(Exception):
    """Custom exception for scraper errors"""
    pass
