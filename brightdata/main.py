from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from datetime import datetime
from typing import List

from models import ScrapeRequest, ScrapeResponse, ErrorResponse, Product
from brightdata_service import BrightDataService
from mock_service import MockDataService
from product_filter import ProductFilterService
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Amazon Product Scraper API",
    description="API for scraping Amazon products using Bright Data",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
brightdata_service = BrightDataService()
mock_service = MockDataService()
filter_service = ProductFilterService()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Amazon Product Scraper API is running",
        "version": "1.0.0",
        "timestamp": datetime.now()
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "api_key_configured": bool(settings.BRIGHTDATA_API_KEY),
        "timestamp": datetime.now()
    }

@app.post("/scrape", response_model=ScrapeResponse)
async def scrape_products(request: ScrapeRequest):
    """
    Scrape Amazon products based on keywords with filtering options
    """
    try:
        logger.info(f"Received scrape request for keywords: {request.keywords}")
        
        # Validate input
        if not request.keywords:
            raise HTTPException(status_code=400, detail="Keywords list cannot be empty")
        
        if len(request.keywords) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 keywords allowed per request")
        
        # Use request parameters or defaults
        min_rating = request.min_rating or settings.MIN_RATING
        max_price = request.max_price or settings.MAX_PRICE
        limit = request.limit or settings.TOP_PRODUCTS_LIMIT
        
        # Validate parameters
        if min_rating < 0 or min_rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 0 and 5")
        
        if max_price <= 0:
            raise HTTPException(status_code=400, detail="Max price must be greater than 0")
        
        if limit <= 0 or limit > 50:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 50")
        
        # Step 1: Search products using Bright Data API (with fallback to mock data)
        try:
            raw_data = await brightdata_service.search_products(request.keywords)
            
            # Check if we got a snapshot_id (async job)
            if isinstance(raw_data, dict) and 'snapshot_id' in raw_data:
                snapshot_id = raw_data['snapshot_id']
                logger.info(f"Received snapshot_id: {snapshot_id}")
                
                # Return the snapshot_id so user can fetch it
                return {
                    "success": True,
                    "message": "Scraping job created successfully",
                    "snapshot_id": snapshot_id,
                    "status": "processing",
                    "fetch_url": f"http://localhost:8000/snapshot/{snapshot_id}",
                    "timestamp": datetime.now(),
                    "keywords_used": request.keywords
                }
            
            all_products = brightdata_service.parse_products(raw_data, request.keywords)
            logger.info("Using Bright Data API")
        except Exception as e:
            logger.warning(f"Bright Data API failed: {str(e)}, using mock data")
            raw_data = await mock_service.search_products(request.keywords)
            all_products = mock_service.parse_products(raw_data, request.keywords)
        
        # Step 3: Filter and rank products
        filtered_products = filter_service.filter_and_rank_products(
            all_products,
            min_rating=min_rating,
            max_price=max_price,
            limit=limit
        )
        
        # Step 4: Prepare response
        response = ScrapeResponse(
            success=True,
            message=f"Successfully scraped and filtered {len(filtered_products)} products",
            products=filtered_products,
            total_found=len(all_products),
            timestamp=datetime.now(),
            keywords_used=request.keywords
        )
        
        logger.info(f"Successfully processed request: {len(filtered_products)} products returned")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing scrape request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/scrape-simple")
async def scrape_simple(keywords: List[str]):
    """
    Simplified endpoint for quick scraping with default filters
    """
    request = ScrapeRequest(keywords=keywords)
    return await scrape_products(request)

@app.get("/products/stats")
async def get_product_stats():
    """
    Get statistics about the filtering service
    """
    return {
        "default_filters": {
            "min_rating": settings.MIN_RATING,
            "max_price": settings.MAX_PRICE,
            "top_limit": settings.TOP_PRODUCTS_LIMIT
        },
        "api_status": {
            "brightdata_configured": bool(settings.BRIGHTDATA_API_KEY),
            "endpoint": settings.BRIGHTDATA_ENDPOINT
        }
    }

@app.get("/snapshot/{snapshot_id}")
async def get_snapshot(snapshot_id: str):
    """
    Download and parse snapshot data from Bright Data
    """
    try:
        logger.info(f"Fetching snapshot: {snapshot_id}")
        
        # Fetch snapshot from Bright Data
        import httpx
        headers = {
            'Authorization': f'Bearer {settings.BRIGHTDATA_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        snapshot_url = f"https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}"
        
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
            response = await client.get(snapshot_url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Snapshot data fetched successfully")
                
                # Parse products from the snapshot
                all_products = brightdata_service.parse_products(data, [])
                
                # Filter and rank products
                filtered_products = filter_service.filter_and_rank_products(
                    all_products,
                    min_rating=settings.MIN_RATING,
                    max_price=settings.MAX_PRICE,
                    limit=settings.TOP_PRODUCTS_LIMIT
                )
                
                return ScrapeResponse(
                    success=True,
                    message=f"Successfully retrieved {len(filtered_products)} products from snapshot",
                    products=filtered_products,
                    total_found=len(all_products),
                    timestamp=datetime.now(),
                    keywords_used=[]  # We don't have keywords from snapshot
                )
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Bright Data snapshot error: {response.text[:200]}"
                )
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching snapshot: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch snapshot: {str(e)}")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            timestamp=datetime.now()
        ).dict()
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
