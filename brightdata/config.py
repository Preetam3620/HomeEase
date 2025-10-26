import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    BRIGHTDATA_API_KEY = os.getenv("BRIGHTDATA_API_KEY", "")
    # Use the correct Bright Data Scraper API endpoint
    # Use NOTIFY=false for sync mode (returns results immediately)
    # The endpoint should wait for results if notify=false is set
    BRIGHTDATA_ENDPOINT = "https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_l7q7dkf244hwjntr0&notify=false&include_errors=true&type=discover_new&discover_by=keyword&wait=true"
    
    MIN_RATING = float(os.getenv("MIN_RATING", "4.0"))
    MAX_PRICE = float(os.getenv("MAX_PRICE", "100.0"))
    TOP_PRODUCTS_LIMIT = int(os.getenv("TOP_PRODUCTS_LIMIT", "5"))
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))

settings = Settings()
