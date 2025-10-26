"""
Example client for integrating with your fetch AI agent
This shows how to use the Amazon Product Scraper API from your AI agent
"""

import requests
import json
from typing import List, Dict, Optional

class AmazonProductScraperClient:
    def __init__(self, api_base_url: str = "http://localhost:8000"):
        self.api_base_url = api_base_url
    
    def scrape_products(
        self, 
        keywords: List[str], 
        min_rating: Optional[float] = None,
        max_price: Optional[float] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """
        Scrape Amazon products with optional filtering
        
        Args:
            keywords: List of search keywords
            min_rating: Minimum product rating (0-5)
            max_price: Maximum product price
            limit: Maximum number of products to return
            
        Returns:
            Dictionary with scraped product data
        """
        payload = {
            "keywords": keywords,
            "min_rating": min_rating,
            "max_price": max_price,
            "limit": limit
        }
        
        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None}
        
        try:
            response = requests.post(
                f"{self.api_base_url}/scrape",
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"API request failed: {str(e)}",
                "products": []
            }
    
    def get_top_products(self, keywords: List[str], top_n: int = 5) -> List[Dict]:
        """
        Get top-rated products for given keywords
        
        Args:
            keywords: List of search keywords
            top_n: Number of top products to return
            
        Returns:
            List of top products
        """
        result = self.scrape_products(
            keywords=keywords,
            min_rating=4.0,  # Only highly rated products
            limit=top_n
        )
        
        if result.get("success"):
            return result.get("products", [])
        else:
            print(f"Error: {result.get('error', 'Unknown error')}")
            return []
    
    def get_affordable_products(self, keywords: List[str], max_price: float = 50.0) -> List[Dict]:
        """
        Get affordable products for given keywords
        
        Args:
            keywords: List of search keywords
            max_price: Maximum price threshold
            
        Returns:
            List of affordable products
        """
        result = self.scrape_products(
            keywords=keywords,
            max_price=max_price,
            limit=10
        )
        
        if result.get("success"):
            return result.get("products", [])
        else:
            print(f"Error: {result.get('error', 'Unknown error')}")
            return []

# Example usage for your fetch AI agent
def example_ai_agent_integration():
    """
    Example of how your fetch AI agent can use this scraper
    """
    scraper = AmazonProductScraperClient()
    
    # Example 1: Get top-rated products
    print("🔍 Fetching top-rated products...")
    top_products = scraper.get_top_products(["tap", "wrench"], top_n=3)
    
    for product in top_products:
        print(f"⭐ {product['title']}")
        print(f"   Price: {product['price']}")
        print(f"   Rating: {product['rating']}")
        print(f"   Link: {product['link']}")
        print()
    
    # Example 2: Get affordable products
    print("💰 Fetching affordable products...")
    affordable_products = scraper.get_affordable_products(["tap", "wrench"], max_price=30.0)
    
    for product in affordable_products:
        print(f"💵 {product['title']}")
        print(f"   Price: {product['price']}")
        print(f"   Rating: {product['rating']}")
        print()
    
    # Example 3: Custom search with specific criteria
    print("🎯 Custom search with specific criteria...")
    custom_result = scraper.scrape_products(
        keywords=["tap", "wrench"],
        min_rating=4.5,  # Very high rating
        max_price=25.0,  # Budget-friendly
        limit=5
    )
    
    if custom_result.get("success"):
        products = custom_result.get("products", [])
        print(f"Found {len(products)} products matching criteria:")
        
        for product in products:
            print(f"🎯 {product['title']}")
            print(f"   Price: {product['price']}")
            print(f"   Rating: {product['rating']}")
            print(f"   Reviews: {product.get('review_count', 'N/A')}")
            print()

# Integration function for your AI agent
def fetch_products_for_ai_agent(keywords: List[str], criteria: Dict = None) -> Dict:
    """
    Main function for your AI agent to fetch products
    
    Args:
        keywords: List of product keywords to search
        criteria: Optional filtering criteria
        
    Returns:
        Dictionary with product data and metadata
    """
    scraper = AmazonProductScraperClient()
    
    # Default criteria
    default_criteria = {
        "min_rating": 4.0,
        "max_price": 100.0,
        "limit": 5
    }
    
    # Merge with provided criteria
    if criteria:
        default_criteria.update(criteria)
    
    result = scraper.scrape_products(keywords, **default_criteria)
    
    # Format response for AI agent
    if result.get("success"):
        return {
            "status": "success",
            "products": result.get("products", []),
            "total_found": result.get("total_found", 0),
            "keywords_searched": keywords,
            "criteria_used": default_criteria,
            "message": f"Found {len(result.get('products', []))} products matching your criteria"
        }
    else:
        return {
            "status": "error",
            "products": [],
            "error": result.get("error", "Unknown error occurred"),
            "keywords_searched": keywords
        }

if __name__ == "__main__":
    # Run example
    example_ai_agent_integration()
    
    # Example for AI agent integration
    print("🤖 AI Agent Integration Example:")
    result = fetch_products_for_ai_agent(
        keywords=["tap", "wrench"],
        criteria={"min_rating": 4.0, "max_price": 50.0, "limit": 3}
    )
    
    print(f"Status: {result['status']}")
    print(f"Message: {result['message']}")
    print(f"Products found: {len(result['products'])}")

