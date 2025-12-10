from .base_scraper import (
    BaseWebScraper,
    ScrapedCourse,
    ScrapedSection,
    ScrapedSession,
    ScraperException
)
from .utec_selenium_scraper import UTECSeleniumScraper

__all__ = [
    "BaseWebScraper",
    "ScrapedCourse",
    "ScrapedSection",
    "ScrapedSession",
    "ScraperException",
    "UTECSeleniumScraper"
]
