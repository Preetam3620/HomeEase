"""
Configuration module for the Store Finder Agent.
"""

import os
from typing import Optional
from dotenv import load_dotenv


class Config:
    """Configuration class for managing environment variables and settings."""
    
    def __init__(self):
        """Load configuration from environment variables."""
        load_dotenv()
        
        # API Keys
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.yelp_api_key = os.getenv("YELP_API_KEY")
        
        # Default settings
        self.default_radius = int(os.getenv("DEFAULT_RADIUS", "10000"))  # meters
        self.default_limit = int(os.getenv("DEFAULT_LIMIT", "20"))
        self.default_sort_by = os.getenv("DEFAULT_SORT_BY", "distance")
        
        # Anthropic settings
        self.anthropic_model = os.getenv("ANTHROPIC_MODEL", "claude-3-sonnet-20240229")
        self.max_tokens = int(os.getenv("MAX_TOKENS", "1000"))
    
    def validate(self) -> bool:
        """Validate that required configuration is present."""
        if not self.anthropic_api_key:
            print("❌ ANTHROPIC_API_KEY is required")
            return False
        
        if not self.yelp_api_key:
            print("❌ YELP_API_KEY is required")
            return False
        
        return True
    
    def get_yelp_api_key(self) -> Optional[str]:
        """Get Yelp API key."""
        return self.yelp_api_key
    
    def get_anthropic_api_key(self) -> Optional[str]:
        """Get Anthropic API key."""
        return self.anthropic_api_key
    
    def get_default_radius(self) -> int:
        """Get default search radius."""
        return self.default_radius
    
    def get_default_limit(self) -> int:
        """Get default result limit."""
        return self.default_limit
    
    def get_default_sort_by(self) -> str:
        """Get default sort method."""
        return self.default_sort_by
    
    def get_anthropic_model(self) -> str:
        """Get Anthropic model name."""
        return self.anthropic_model
    
    def get_max_tokens(self) -> int:
        """Get maximum tokens for Anthropic responses."""
        return self.max_tokens

