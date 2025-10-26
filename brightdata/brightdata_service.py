import httpx
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class BrightDataService:
    def __init__(self):
        from config import settings
        self.api_key = settings.BRIGHTDATA_API_KEY
        self.endpoint = settings.BRIGHTDATA_ENDPOINT
        self.timeout = settings.REQUEST_TIMEOUT
        
        if not self.api_key:
            raise ValueError("BRIGHTDATA_API_KEY not found in environment variables")
    
    async def search_products(self, keywords: List[str]) -> Dict[str, Any]:
        """Search for products using Bright Data's Amazon search API"""
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        # User's exact format: {"input":[{"keyword":"light bulb"},{"keyword":"dog toys"}]}
        data = {
            "input": [{"keyword": keyword} for keyword in keywords]
        }
        
        logger.info(f"Making Bright Data request with data: {data}")
        
        # Use longer timeout since Bright Data scraping can take time
        timeout = httpx.Timeout(120.0)  # 2 minutes
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                # Send request exactly as the working Python script does
                logger.info(f"Sending request to: {self.endpoint}")
                logger.info(f"Request data: {data}")
                
                response = await client.post(
                    self.endpoint,
                    json=data,
                    headers=headers
                )
                
                logger.info(f"Bright Data response status: {response.status_code}")
                
                # Bright Data returns 202 for async jobs with snapshot_id
                if response.status_code in [200, 202]:
                    logger.info(f"✅ SUCCESS! Status: {response.status_code}")
                    result = response.json()
                    
                    # If async (202 or 200 with snapshot_id), we get a snapshot_id
                    snapshot_id = result.get('snapshot_id')
                    if snapshot_id:
                        logger.info(f"✅ Async job created with snapshot_id: {snapshot_id}")
                        # Return the snapshot info - user will poll separately
                        return result
                    
                    logger.info(f"Response keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
                    return result
                else:
                    error_text = response.text[:500] if hasattr(response, 'text') else "No error text"
                    logger.warning(f"Bright Data error response (status {response.status_code}): {error_text}")
                    raise Exception(f"Bright Data returned status {response.status_code}: {error_text}")
                    
            except httpx.TimeoutException as e:
                logger.error(f"Bright Data API timeout after 120 seconds: {str(e)}")
                raise Exception("Bright Data API timed out - request is taking too long")
            except httpx.HTTPStatusError as e:
                logger.error(f"Bright Data HTTP error: {str(e)}")
                raise Exception(f"Bright Data HTTP error {e.response.status_code}: {str(e)}")
            except Exception as e:
                logger.error(f"Bright Data API exception: {str(e)}")
                raise
    
    async def _poll_snapshot(self, snapshot_id: str) -> Dict[str, Any]:
        """Poll Bright Data snapshot until it's ready"""
        import asyncio
        
        snapshot_url = f"https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}"
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        max_attempts = 30  # Poll for up to 30 attempts
        poll_interval = 5  # Wait 5 seconds between polls
        
        async with httpx.AsyncClient(timeout=httpx.Timeout(300.0)) as client:
            for attempt in range(1, max_attempts + 1):
                try:
                    logger.info(f"Polling snapshot (attempt {attempt}/{max_attempts})...")
                    
                    response = await client.get(snapshot_url, headers=headers)
                    
                    logger.info(f"Snapshot status: {response.status_code}")
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Check if snapshot is ready
                        status = data.get('status', 'unknown')
                        logger.info(f"Snapshot status: {status}")
                        
                        if status in ['ready', 'complete', 'done']:
                            logger.info("✅ Snapshot is ready!")
                            return data
                        elif status in ['failed', 'error']:
                            logger.error(f"❌ Snapshot failed: {data}")
                            raise Exception(f"Snapshot failed with status: {status}")
                        else:
                            logger.info(f"Snapshot still processing (status: {status}), waiting...")
                            await asyncio.sleep(poll_interval)
                    elif response.status_code == 202:
                        logger.info("Snapshot still processing, waiting...")
                        await asyncio.sleep(poll_interval)
                    else:
                        logger.warning(f"Unexpected status {response.status_code}: {response.text[:200]}")
                        await asyncio.sleep(poll_interval)
                        
                except httpx.HTTPStatusError as e:
                    logger.warning(f"HTTP error polling snapshot: {e}")
                    await asyncio.sleep(poll_interval)
                except Exception as e:
                    logger.error(f"Error polling snapshot: {str(e)}")
                    await asyncio.sleep(poll_interval)
        
        raise Exception("Timeout waiting for snapshot to complete")
    
    def parse_products(self, raw_data: Dict[str, Any], keywords: List[str]) -> List:
        """Parse raw API response and extract product information"""
        from models import Product
        import json
        
        # Check if this is a snapshot_id response (not product data yet)
        if 'snapshot_id' in raw_data:
            logger.warning("Received snapshot_id - results are not yet ready")
            return []  # Return empty for now, user needs to poll the snapshot
        
        products = []
        
        try:
            # Debug: Log the raw response structure
            logger.info(f"Raw response keys: {list(raw_data.keys())}")
            
            # Navigate through the response structure
            search_results = raw_data
            
            # Process each keyword's results
            if 'data' in search_results:
                for keyword_data in search_results['data']:
                    if isinstance(keyword_data, dict) and 'results' in keyword_data:
                        keyword_results = keyword_data['results']
                    elif isinstance(keyword_data, list):
                        keyword_results = keyword_data
                    else:
                        continue
                    
                    for item in keyword_results:
                        try:
                            product = self._extract_product_data(item)
                            if product:
                                products.append(product)
                        except Exception as e:
                            logger.warning(f"Failed to parse product item: {str(e)}")
                            continue
            
            logger.info(f"Successfully parsed {len(products)} products")
            return products
            
        except Exception as e:
            logger.error(f"Error parsing product data: {str(e)}")
            return []
    
    def _extract_product_data(self, item: Dict[str, Any]):
        """Extract product data from a single item"""
        from models import Product
        
        try:
            title = item.get('title', item.get('name', ''))
            link = item.get('url', item.get('link', item.get('product_link', '')))
            
            # Try multiple possible image fields
            image = item.get('image', None)
            if not image:
                image = item.get('image_url', None)
            if not image:
                image = item.get('thumbnail', None)
            if not image:
                image = item.get('product_image', None)
            if not image:
                image = item.get('img', None)
            if not image:
                image = ''  # Default empty if no image found
            
            price = item.get('price', item.get('price_text', ''))
            
            # Extract rating
            rating_raw = item.get('rating', item.get('stars', 0))
            if isinstance(rating_raw, str):
                try:
                    rating = float(rating_raw.split()[0])
                except:
                    rating = 0.0
            else:
                rating = float(rating_raw) if rating_raw else 0.0
            
            review_count = item.get('review_count', item.get('reviews', 0))
            if isinstance(review_count, str):
                try:
                    review_count = int(review_count.replace(',', '').split()[0])
                except:
                    review_count = 0
            
            asin = item.get('asin', item.get('product_id', ''))
            availability = item.get('availability', item.get('in_stock', 'Unknown'))
            
            if not title or not link:
                return None
            
            return Product(
                title=title,
                link=link,
                image=image,
                price=price,
                rating=rating,
                review_count=review_count,
                asin=asin,
                availability=availability
            )
            
        except Exception as e:
            logger.warning(f"Error extracting product data: {str(e)}")
            return None
