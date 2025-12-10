import re
from datetime import time
from typing import List, Optional, Dict
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time as time_module

from .base_scraper import (
    BaseWebScraper, ScrapedCourse, ScrapedSection, ScrapedSession, ScraperException
)


class UTECSeleniumScraper(BaseWebScraper):
    """
    Selenium-based scraper for UTEC's enrollment website

    This scraper navigates the UTEC enrollment portal and extracts:
    - Course codes and names
    - Section numbers
    - Capacity, enrolled, waitlisted counts
    - Professor information
    - Session schedules (days, times, locations)

    Example config:
    {
        "url": "https://registro.utec.edu.pe/courses",
        "login_required": True,
        "login_url": "https://registro.utec.edu.pe/login",
        "username": "admin@utec.edu.pe",
        "password": "secret",
        "headless": True,
        "wait_time": 10
    }
    """

    def __init__(self, config: Dict):
        super().__init__(config)
        self.wait_time = config.get('wait_time', 10)
        self.login_required = config.get('login_required', False)

    def validate_page(self) -> bool:
        """Validate that UTEC enrollment page is accessible"""
        driver = None
        try:
            driver = self.setup_driver()
            driver.get(self.url)

            # Wait for page to load
            WebDriverWait(driver, self.wait_time).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )

            # Check if login is required
            if "login" in driver.current_url.lower() and not self.login_required:
                raise ScraperException("Login required but credentials not provided")

            return True

        except Exception as e:
            raise ScraperException(f"Page validation failed: {str(e)}")

        finally:
            if driver:
                driver.quit()

    def scrape(self) -> List[ScrapedCourse]:
        """
        Scrape UTEC enrollment data

        Returns:
            List of ScrapedCourse objects

        Raises:
            ScraperException: If scraping fails
        """
        driver = None
        try:
            driver = self.setup_driver()

            # Login if required
            if self.login_required:
                self._perform_login(driver)

            # Navigate to enrollment page
            driver.get(self.url)
            self._wait_for_enrollment_table(driver)

            # Extract courses
            courses = self._extract_courses(driver)

            print(f"✅ Scraped {len(courses)} courses from UTEC")
            return courses

        except Exception as e:
            raise ScraperException(f"Scraping failed: {str(e)}")

        finally:
            if driver:
                driver.quit()

    def _perform_login(self, driver):
        """Perform login to UTEC portal"""
        login_url = self.config.get('login_url')
        username = self.config.get('username')
        password = self.config.get('password')

        if not all([login_url, username, password]):
            raise ScraperException("Login credentials incomplete")

        driver.get(login_url)

        try:
            # Wait for login form
            username_field = WebDriverWait(driver, self.wait_time).until(
                EC.presence_of_element_located((By.ID, "username"))
            )
            password_field = driver.find_element(By.ID, "password")
            submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")

            # Enter credentials
            username_field.send_keys(username)
            password_field.send_keys(password)
            submit_button.click()

            # Wait for redirect to main page
            WebDriverWait(driver, self.wait_time).until(
                EC.url_changes(login_url)
            )

        except TimeoutException:
            raise ScraperException("Login timeout - check credentials")

    def _wait_for_enrollment_table(self, driver):
        """Wait for enrollment table to load"""
        try:
            WebDriverWait(driver, self.wait_time).until(
                EC.presence_of_element_located((By.CLASS_NAME, "courses-table"))
            )
        except TimeoutException:
            # Try alternative selector
            try:
                WebDriverWait(driver, self.wait_time).until(
                    EC.presence_of_element_located((By.TAG_NAME, "table"))
                )
            except TimeoutException:
                raise ScraperException("Enrollment table not found on page")

    def _extract_courses(self, driver) -> List[ScrapedCourse]:
        """
        Extract courses from the enrollment page

        This is a TEMPLATE implementation - adjust selectors to match UTEC's actual HTML structure
        """
        courses_data: Dict[str, dict] = {}

        try:
            # Find all course rows (adjust selector to match actual HTML)
            table = driver.find_element(By.TAG_NAME, "table")
            rows = table.find_elements(By.TAG_NAME, "tr")[1:]  # Skip header

            for row in rows:
                try:
                    cols = row.find_elements(By.TAG_NAME, "td")

                    if len(cols) < 8:
                        continue  # Skip malformed rows

                    # Extract data (adjust indices to match actual table structure)
                    course_code = cols[0].text.strip()
                    course_name = cols[1].text.strip()
                    section_num = cols[2].text.strip()
                    session_group = cols[3].text.strip()
                    schedule = cols[4].text.strip()
                    professor = cols[5].text.strip() or "TBD"
                    capacity = self._parse_int(cols[6].text.strip(), 30)
                    enrolled = self._parse_int(cols[7].text.strip(), 0)
                    waitlisted = self._parse_int(cols[8].text.strip() if len(cols) > 8 else "0", 0)
                    location = cols[9].text.strip() if len(cols) > 9 else ""
                    modality = cols[10].text.strip() if len(cols) > 10 else "Presencial"

                    # Parse schedule
                    days, start_time, end_time = self._parse_schedule(schedule)

                    if not days or not start_time or not end_time:
                        continue

                    # Create sessions for each day
                    sessions = []
                    for day in days:
                        session = ScrapedSession(
                            session_type=session_group,
                            day=day,
                            start_time=start_time,
                            end_time=end_time,
                            location=location,
                            building=self._extract_building(location),
                            room=self._extract_room(location),
                            modality=modality,
                            frequency="Semana General"
                        )
                        sessions.append(session)

                    # Group by course code
                    if course_code not in courses_data:
                        courses_data[course_code] = {
                            'name': course_name,
                            'sections': {}
                        }

                    # Group by section number
                    if section_num not in courses_data[course_code]['sections']:
                        courses_data[course_code]['sections'][section_num] = {
                            'capacity': capacity,
                            'enrolled': enrolled,
                            'waitlisted': waitlisted,
                            'professor': professor,
                            'sessions': []
                        }

                    # Add sessions
                    courses_data[course_code]['sections'][section_num]['sessions'].extend(sessions)

                except (NoSuchElementException, IndexError) as e:
                    print(f"⚠️  Skipping malformed row: {e}")
                    continue

        except NoSuchElementException:
            raise ScraperException("Table structure not found - HTML may have changed")

        # Convert to ScrapedCourse objects
        result = []
        for course_code, course_info in courses_data.items():
            sections = []
            for section_num, section_info in course_info['sections'].items():
                section = ScrapedSection(
                    section_number=section_num,
                    capacity=section_info['capacity'],
                    enrolled=section_info['enrolled'],
                    waitlisted=section_info['waitlisted'],
                    professor=section_info['professor'],
                    professor_email="",  # Email not available from scraping
                    sessions=section_info['sessions']
                )
                sections.append(section)

            course = ScrapedCourse(
                code=course_code,
                name=course_info['name'],
                department=self.extract_department(course_code),
                sections=sections
            )
            result.append(course)

        return result

    def _parse_schedule(self, schedule_str: str) -> tuple:
        """Parse schedule string like 'Lun. Mar. 15:00 - 18:00'"""
        if not schedule_str:
            return [], None, None

        # Pattern: "Mar. 15:00 - 18:00" or "Lun. Mie. 10:00 - 12:00"
        time_pattern = r'(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})'
        time_match = re.search(time_pattern, schedule_str)

        if not time_match:
            return [], None, None

        start_time = self._parse_time(time_match.group(1))
        end_time = self._parse_time(time_match.group(2))

        if not start_time or not end_time:
            return [], None, None

        # Extract days part
        days_part = schedule_str[:time_match.start()].strip()

        # Spanish day abbreviations
        spanish_days = {
            'Lun': 'Monday', 'Mar': 'Tuesday', 'Mie': 'Wednesday', 'Mié': 'Wednesday',
            'Jue': 'Thursday', 'Vie': 'Friday', 'Sab': 'Saturday', 'Dom': 'Sunday'
        }

        days = []
        for day_abbr in re.findall(r'[A-ZÁÉÍÓÚáéíóú][a-záéíóú]+', days_part):
            day_abbr = day_abbr.strip('.')
            if day_abbr in spanish_days:
                days.append(spanish_days[day_abbr])

        return days, start_time, end_time

    def _parse_time(self, time_str: str) -> Optional[time]:
        """Parse time string to time object"""
        if not time_str:
            return None

        try:
            time_str = str(time_str).strip()

            # Format: "14:00"
            if ':' in time_str:
                hour, minute = time_str.split(':')
                return time(int(hour), int(minute))

        except ValueError:
            return None

        return None

    def _parse_int(self, value: str, default: int = 0) -> int:
        """Parse integer from string with default fallback"""
        try:
            return int(value)
        except (ValueError, TypeError):
            return default

    def _extract_building(self, location: str) -> str:
        """Extract building from location string"""
        if not location:
            return ""

        match = re.match(r'^([^A-Z0-9]*[A-Z\-]+)', location)
        return match.group(1).strip() if match else ""

    def _extract_room(self, location: str) -> str:
        """Extract room from location string"""
        if not location:
            return ""

        match = re.search(r'([A-Z]\d+)', location)
        return match.group(1) if match else ""
