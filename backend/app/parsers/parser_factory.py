from typing import Dict, Type, Any, List
from .base_parser import BaseParser, ParserException
from .utec_csv_parser import UTECCSVParser

class ParserFactory:
    """
    Factory for creating appropriate parser based on university configuration

    Supports automatic parser detection and registration of custom parsers.
    """

    _parsers: Dict[str, Type[BaseParser]] = {
        'UTECCSVParser': UTECCSVParser,
        # Add more parsers as needed:
        # 'WinnerPDFParser': WinnerPDFParser,
        # 'UniversityXHTMLParser': UniversityXHTMLParser,
    }

    @classmethod
    def create_parser(cls, parser_class: str, config: Dict[str, Any]) -> BaseParser:
        """
        Create a parser instance

        Args:
            parser_class: Name of the parser class (e.g., 'UTECCSVParser')
            config: Parser configuration dictionary

        Returns:
            Parser instance

        Raises:
            ParserException: If parser class is not found
        """
        if parser_class not in cls._parsers:
            raise ParserException(f"Unknown parser class: {parser_class}")

        parser_type = cls._parsers[parser_class]
        return parser_type(config)

    @classmethod
    def register_parser(cls, name: str, parser_class: Type[BaseParser]):
        """
        Register a new parser type

        Args:
            name: Name to register the parser under
            parser_class: Parser class to register
        """
        cls._parsers[name] = parser_class

    @classmethod
    def detect_parser(cls, file_content: bytes, filename: str,
                     preferred_parser: str = None) -> BaseParser:
        """
        Auto-detect the appropriate parser for a file

        Args:
            file_content: Raw file bytes
            filename: Original filename
            preferred_parser: Preferred parser class name (if known)

        Returns:
            Parser instance that can handle the file

        Raises:
            ParserException: If no suitable parser is found
        """
        # Try preferred parser first
        if preferred_parser and preferred_parser in cls._parsers:
            parser = cls._parsers[preferred_parser]({})
            if parser.validate_format(file_content, filename):
                return parser

        # Try all registered parsers
        for parser_name, parser_class in cls._parsers.items():
            parser = parser_class({})
            if parser.validate_format(file_content, filename):
                return parser

        raise ParserException(f"No suitable parser found for file: {filename}")

    @classmethod
    def get_available_parsers(cls) -> List[str]:
        """Get list of all available parser names"""
        return list(cls._parsers.keys())
