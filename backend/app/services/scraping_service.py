from typing import Tuple, Dict
from sqlalchemy.orm import Session

from app.repositories.university_repository import UniversityRepository
from app.repositories.parser_configuration_repository import ParserConfigurationRepository
from app.repositories.academic_period_repository import AcademicPeriodRepository
from app.services.import_service import ImportService
from app.scrapers.base_scraper import BaseWebScraper, ScraperException
from app.scrapers.utec_selenium_scraper import UTECSeleniumScraper
from app.parsers.base_parser import ParsedCourse, ParsedSection, ParsedSession


class ScrapingService:
    """
    Service for automated web scraping of enrollment data

    Orchestrates:
    1. Loading scraper configuration for a university
    2. Running appropriate scraper (Selenium-based)
    3. Converting scraped data to ParsedCourse format
    4. Calling ImportService to update database
    5. Logging scraping status and errors

    This service is designed to be called by:
    - Scheduled tasks (Celery/n8n)
    - Admin API endpoints
    - CLI scripts
    """

    # Registry of available scrapers
    SCRAPERS = {
        'UTECSeleniumScraper': UTECSeleniumScraper,
        # Add more scrapers as needed:
        # 'WinnerSeleniumScraper': WinnerSeleniumScraper,
    }

    def __init__(self, db: Session):
        self.db = db
        self.university_repo = UniversityRepository(db)
        self.config_repo = ParserConfigurationRepository(db)
        self.period_repo = AcademicPeriodRepository(db)
        self.import_service = ImportService(db)

    def scrape_university_enrollment(self, university_id: int) -> Tuple[int, Dict]:
        """
        Scrape enrollment data for a specific university

        Args:
            university_id: University ID to scrape

        Returns:
            Tuple of (import_log_id, statistics_dict)

        Raises:
            ScraperException: If scraping fails
            ValueError: If university doesn't support automated scraping
        """
        # 1. Get university
        university = self.university_repo.get_by_id(university_id)
        if not university:
            raise ValueError(f"University {university_id} not found")

        # 2. Get parser/scraper configuration
        config = self.config_repo.get_by_university_id(university_id)
        if not config:
            raise ValueError(f"No parser configuration found for university {university_id}")

        if not config.supports_automated_scraping:
            raise ValueError(f"University {university.name} does not support automated scraping")

        if not config.scrape_url:
            raise ValueError(f"No scrape URL configured for {university.name}")

        # 3. Get current academic period
        current_period = self.period_repo.get_current_period(university_id)
        if not current_period:
            raise ValueError(f"No current academic period set for {university.name}")

        # 4. Load scraper configuration
        import json
        scraper_config = json.loads(config.config_json) if config.config_json else {}
        scraper_config['url'] = config.scrape_url

        # 5. Create scraper instance
        scraper_class_name = config.parser_class  # Reuse parser_class for scraper
        if scraper_class_name not in self.SCRAPERS:
            raise ValueError(f"Unknown scraper class: {scraper_class_name}")

        scraper_class = self.SCRAPERS[scraper_class_name]
        scraper: BaseWebScraper = scraper_class(scraper_config)

        print(f"🌐 Starting scrape for {university.name} ({university.short_name})")

        # 6. Scrape data
        try:
            scraped_courses = scraper.scrape()
            print(f"✅ Scraped {len(scraped_courses)} courses")
        except Exception as e:
            raise ScraperException(f"Scraping failed for {university.name}: {str(e)}")

        # 7. Convert scraped data to ParsedCourse format
        parsed_courses = self._convert_to_parsed_courses(scraped_courses)

        # 8. Import into database
        log_id, stats = self.import_service.import_courses(
            parsed_courses=parsed_courses,
            university_id=university_id,
            academic_period_id=current_period.id,
            import_type='automated_scrape',
            source_file=config.scrape_url,
            file_hash=None  # No file hash for scraping
        )

        print(f"✅ Import completed: {stats}")
        return log_id, stats

    def _convert_to_parsed_courses(self, scraped_courses) -> list:
        """
        Convert ScrapedCourse objects to ParsedCourse objects

        This bridges the scraper and parser data structures.
        """
        parsed_courses = []

        for scraped_course in scraped_courses:
            # Convert sections
            parsed_sections = []
            for scraped_section in scraped_course.sections:
                # Convert sessions
                parsed_sessions = []
                for scraped_session in scraped_section.sessions:
                    parsed_session = ParsedSession(
                        session_type=scraped_session.session_type,
                        day=scraped_session.day,
                        start_time=scraped_session.start_time,
                        end_time=scraped_session.end_time,
                        location=scraped_session.location,
                        building=scraped_session.building,
                        room=scraped_session.room,
                        modality=scraped_session.modality,
                        frequency=scraped_session.frequency
                    )
                    parsed_sessions.append(parsed_session)

                parsed_section = ParsedSection(
                    section_number=scraped_section.section_number,
                    capacity=scraped_section.capacity,
                    enrolled=scraped_section.enrolled,
                    waitlisted=scraped_section.waitlisted,
                    professor=scraped_section.professor,
                    professor_email=scraped_section.professor_email,
                    sessions=parsed_sessions
                )
                parsed_sections.append(parsed_section)

            parsed_course = ParsedCourse(
                code=scraped_course.code,
                name=scraped_course.name,
                department=scraped_course.department,
                sections=parsed_sections
            )
            parsed_courses.append(parsed_course)

        return parsed_courses

    def validate_scraper_configuration(self, university_id: int) -> bool:
        """
        Validate that scraper configuration is correct

        Args:
            university_id: University ID to validate

        Returns:
            True if configuration is valid

        Raises:
            ScraperException: If validation fails
        """
        # Get configuration
        config = self.config_repo.get_by_university_id(university_id)
        if not config or not config.supports_automated_scraping:
            raise ValueError("University does not support automated scraping")

        import json
        scraper_config = json.loads(config.config_json) if config.config_json else {}
        scraper_config['url'] = config.scrape_url

        # Create scraper
        scraper_class = self.SCRAPERS.get(config.parser_class)
        if not scraper_class:
            raise ValueError(f"Unknown scraper: {config.parser_class}")

        scraper = scraper_class(scraper_config)

        # Validate
        return scraper.validate_page()
