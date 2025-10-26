from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Product(BaseModel):
    title: str
    link: str
    image: str
    price: str
    rating: float
    review_count: Optional[int] = None
    availability: Optional[str] = None
    asin: Optional[str] = None

class ScrapeRequest(BaseModel):
    keywords: List[str]
    min_rating: Optional[float] = None
    max_price: Optional[float] = None
    limit: Optional[int] = None

class ScrapeResponse(BaseModel):
    success: bool
    message: str
    products: List[Product]
    total_found: int
    timestamp: datetime
    keywords_used: List[str]

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    timestamp: datetime

