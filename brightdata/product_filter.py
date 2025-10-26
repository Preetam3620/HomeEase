import re
import logging
from typing import List, Optional
from models import Product

logger = logging.getLogger(__name__)

class ProductFilterService:
    def __init__(self):
        self.min_rating = 4.0
        self.max_price = 100.0
        self.top_limit = 5
    
    def filter_and_rank_products(
        self, 
        products: List[Product], 
        min_rating: Optional[float] = None,
        max_price: Optional[float] = None,
        limit: Optional[int] = None
    ) -> List[Product]:
        if not products:
            return []
        
        min_rating = min_rating or self.min_rating
        max_price = max_price or self.max_price
        limit = limit or self.top_limit
        
        logger.info(f"Filtering {len(products)} products with min_rating={min_rating}, max_price={max_price}")
        
        filtered_by_rating = [
            product for product in products 
            if product.rating >= min_rating
        ]
        
        filtered_by_price = []
        for product in filtered_by_rating:
            price_value = self._extract_price_value(product.price)
            if price_value is not None and price_value <= max_price:
                filtered_by_price.append(product)
        
        sorted_products = sorted(
            filtered_by_price,
            key=lambda p: (-p.rating, self._extract_price_value(p.price) or float('inf'))
        )
        
        top_products = sorted_products[:limit]
        
        logger.info(f"Final result: {len(top_products)} top products")
        return top_products
    
    def _extract_price_value(self, price_str: str) -> Optional[float]:
        if not price_str:
            return None
        
        try:
            price_clean = re.sub(r'[^\d.,]', '', price_str)
            
            if ',' in price_clean and '.' in price_clean:
                price_clean = price_clean.replace(',', '')
            elif ',' in price_clean and len(price_clean.split(',')[-1]) <= 2:
                price_clean = price_clean.replace(',', '.')
            
            return float(price_clean)
            
        except (ValueError, AttributeError):
            logger.warning(f"Could not extract price from: {price_str}")
            return None
