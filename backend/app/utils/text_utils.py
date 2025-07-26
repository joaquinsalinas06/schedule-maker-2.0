"""
Text utilities for search normalization
"""
import unicodedata
import re
from typing import Optional


def normalize_text(text: Optional[str]) -> str:
    """
    Normalize text for search purposes by:
    - Converting to lowercase
    - Removing accents/diacritics
    - Normalizing whitespace
    - Removing extra punctuation
    
    Args:
        text: Input text to normalize
        
    Returns:
        Normalized text string, empty string if input is None
    """
    if not text:
        return ""
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove accents/diacritics using Unicode normalization
    # NFD = Normalization Form Decomposed (separates base chars from accents)
    # Then filter out combining characters (accents)
    normalized = unicodedata.normalize('NFD', text)
    without_accents = ''.join(
        char for char in normalized 
        if unicodedata.category(char) != 'Mn'  # Mn = Nonspacing_Mark (accents)
    )
    
    # Normalize whitespace (replace multiple spaces/tabs/newlines with single space)
    normalized_spaces = re.sub(r'\s+', ' ', without_accents).strip()
    
    return normalized_spaces


def create_search_terms(query: str) -> list[str]:
    """
    Create search terms from a query by:
    - Normalizing the text
    - Splitting into individual words
    - Filtering out very short terms
    - Creating variations to match both normalized and original text
    
    Args:
        query: Search query string
        
    Returns:
        List of normalized search terms
    """
    if not query:
        return []
    
    normalized = normalize_text(query)
    terms = normalized.split()
    
    # Filter out very short terms (less than 2 characters)
    meaningful_terms = [term for term in terms if len(term) >= 2]
    
    # Also include original terms to catch non-normalized database content
    original_terms = query.lower().split()
    meaningful_original = [term for term in original_terms if len(term) >= 2]
    
    # Combine normalized and original terms, removing duplicates
    all_terms = list(set(meaningful_terms + meaningful_original))
    
    return all_terms


def create_search_pattern(terms: list[str]) -> str:
    """
    Create a SQL LIKE pattern from search terms for PostgreSQL
    
    Args:
        terms: List of search terms
        
    Returns:
        SQL pattern string for use with LIKE/ILIKE
    """
    if not terms:
        return "%"
    
    # Create pattern that matches all terms in any order
    # Each term must be present but can be anywhere in the text
    pattern_parts = [f"%{term}%" for term in terms]
    return "".join(pattern_parts)


def should_perform_search(query: Optional[str], min_length: int = 3) -> bool:
    """
    Determine if a search should be performed based on query length
    
    Args:
        query: Search query
        min_length: Minimum length to trigger search
        
    Returns:
        True if search should be performed
    """
    if not query:
        return False
    
    normalized = normalize_text(query)
    return len(normalized) >= min_length