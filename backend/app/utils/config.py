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
    
    missing = validate_required_env_vars()
    if missing:
        print(f"   ⚠️  Missing required variables: {', '.join(missing)}")
    else:
        print("   ✅ All required variables are set")
    print()