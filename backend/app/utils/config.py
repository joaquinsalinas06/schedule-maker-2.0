import os
from typing import Optional


def should_use_dotenv() -> bool:
    use_dotenv = os.getenv("USE_DOTENV", "true").lower()
    return use_dotenv in ("true", "1", "yes", "on")


def load_environment() -> None:
    if should_use_dotenv():
        try:
            from dotenv import load_dotenv
            env_loaded = load_dotenv()
            
            if env_loaded:
                print("🔧 Environment: Loaded configuration from .env file")
            else:
                print("⚠️  Environment: .env file not found, using OS environment variables")
                
        except ImportError:
            print("⚠️  Environment: python-dotenv not installed, using OS environment variables")
    else:
        print("🚀 Environment: Using OS environment variables (production mode)")


def get_env_bool(key: str, default: bool = False) -> bool:
    value = os.getenv(key, "").lower()
    if not value:
        return default
    return value in ("true", "1", "yes", "on")


def get_env_int(key: str, default: int = 0) -> int:
    try:
        return int(os.getenv(key, str(default)))
    except (ValueError, TypeError):
        return default


def get_env_list(key: str, separator: str = ",", default: Optional[list] = None) -> list:
    if default is None:
        default = []
        
    value = os.getenv(key, "")
    if not value:
        return default
        
    return [item.strip() for item in value.split(separator) if item.strip()]


# Environment configuration validation
def validate_required_env_vars() -> list:
    """
    Validate that all required environment variables are set.
    
    Returns:
        List of missing required environment variables
    """
    required_vars = [
        "DATABASE_URL",
        "SECRET_KEY",
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    return missing_vars


def print_config_summary() -> None:
    print("\n📋 Configuration Summary:")
    print(f"   • USE_DOTENV: {os.getenv('USE_DOTENV', 'true')}")
    print(f"   • DATABASE_URL: {'✓ Set' if os.getenv('DATABASE_URL') else '✗ Missing'}")
    print(f"   • SECRET_KEY: {'✓ Set' if os.getenv('SECRET_KEY') else '✗ Missing'}")
    print(f"   • CORS_ORIGINS: {os.getenv('CORS_ORIGINS', 'http://localhost:3000')}")
    print(f"   • ADMIN_EMAIL: {'✓ Set' if os.getenv('ADMIN_EMAIL') else '✗ Not Set'}")
    print(f"   • SMTP_SERVER: {'✓ Set' if os.getenv('SMTP_SERVER') else '✗ Not Set'}")
    print(f"   • FROM_EMAIL: {'✓ Set' if os.getenv('FROM_EMAIL') else '✗ Not Set'}")
    
    missing = validate_required_env_vars()
    if missing:
        print(f"   ⚠️  Missing required variables: {', '.join(missing)}")
    else:
        print("   ✅ All required variables are set")
    print()


class Settings:
    """Application settings loaded from environment variables."""
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = get_env_int("ACCESS_TOKEN_EXPIRE_MINUTES", 30)
    
    # CORS
    CORS_ORIGINS: list = get_env_list("CORS_ORIGINS", default=["http://localhost:3000"])
    
    # Admin
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "")
    
    # Email Configuration
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = get_env_int("SMTP_PORT", 587)
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_USE_TLS: bool = get_env_bool("SMTP_USE_TLS", True)
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "")
    
    # Email Verification Settings
    EMAIL_VERIFICATION_EXPIRE_MINUTES: int = get_env_int("EMAIL_VERIFICATION_EXPIRE_MINUTES", 15)
    EMAIL_VERIFICATION_MAX_ATTEMPTS: int = get_env_int("EMAIL_VERIFICATION_MAX_ATTEMPTS", 5)
    
    # Development
    DEBUG: bool = get_env_bool("DEBUG", False)


# Global settings instance
settings = Settings()