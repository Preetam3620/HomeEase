import logging
from typing import List, Dict, Any
from models import Product

logger = logging.getLogger(__name__)

class MockDataService:
    def __init__(self):
        # Using REAL Amazon product ASINs that should work
        self.mock_products = [
            {
                "title": "Professional Tap and Die Set - 40 Piece",
                "url": "https://www.amazon.com/dp/B08CVSLHQD",
                "image": "https://images-na.ssl-images-amazon.com/images/I/61YVz1vKJZL._AC_SL1500_.jpg",
                "price": "$45.99",
                "rating": 4.5,
                "review_count": 1234,
                "asin": "B08CVSLHQD",
                "availability": "In Stock"
            },
            {
                "title": "Crescent Adjustable Wrench Set",
                "url": "https://www.amazon.com/dp/B07ZBXXF6H",
                "image": "https://images-na.ssl-images-amazon.com/images/I/81Yqy5Xs8XL._AC_SL1500_.jpg",
                "price": "$32.50",
                "rating": 4.3,
                "review_count": 856,
                "asin": "B07ZBXXF6H",
                "availability": "In Stock"
            },
            {
                "title": "Precision Tap Wrench with Comfort Grip",
                "url": "https://www.amazon.com/dp/B00BCP7KHQ",
                "image": "https://images-na.ssl-images-amazon.com/images/I/71T5R7YyHXL._AC_SL1500_.jpg",
                "price": "$18.75",
                "rating": 4.7,
                "review_count": 2341,
                "asin": "B00BCP7KHQ",
                "availability": "In Stock"
            }
        ]
    
    async def search_products(self, keywords: List[str]) -> Dict[str, Any]:
        logger.info(f"Using mock data for keywords: {keywords}")
        
        filtered_products = []
        for product in self.mock_products:
            title_lower = product["title"].lower()
            if any(keyword.lower() in title_lower for keyword in keywords):
                filtered_products.append(product)
        
        if not filtered_products:
            filtered_products = self.mock_products
        
        return {
            "data": [
                {
                    "keyword": keywords[0] if keywords else "test",
                    "results": filtered_products
                }
            ]
        }
    
    def parse_products(self, raw_data: Dict[str, Any], keywords: List[str]) -> List[Product]:
        products = []
        
        try:
            if 'data' in raw_data:
                search_results = raw_data['data']
            else:
                search_results = raw_data
            
            for keyword_data in search_results:
                if isinstance(keyword_data, dict) and 'results' in keyword_data:
                    keyword_results = keyword_data['results']
                elif isinstance(keyword_data, list):
                    keyword_results = keyword_data
                else:
                    continue
                
                for item in keyword_results:
                    try:
                        product = Product(
                            title=item.get('title', ''),
                            link=item.get('url', ''),
                            image=item.get('image', ''),
                            price=item.get('price', ''),
                            rating=float(item.get('rating', 0)),
                            review_count=item.get('review_count', 0),
                            asin=item.get('asin', ''),
                            availability=item.get('availability', 'Unknown')
                        )
                        products.append(product)
                    except Exception as e:
                        logger.warning(f"Failed to parse product item: {str(e)}")
                        continue
            
            logger.info(f"Successfully parsed {len(products)} mock products")
            return products
            
        except Exception as e:
            logger.error(f"Error parsing mock product data: {str(e)}")
            return []
