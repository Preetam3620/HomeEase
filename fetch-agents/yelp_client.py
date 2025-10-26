"""
Yelp API integration module for finding hardware stores.
"""

import requests
import os
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class HardwareStore:
    """Data class representing a hardware store."""
    name: str
    address: str
    city: str
    state: str
    zip_code: str
    phone: str
    rating: float
    review_count: int
    distance: float
    url: str
    categories: List[str]


class YelpAPI:
    """Yelp API client for searching hardware stores."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.yelp.com/v3"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def search_hardware_stores(
        self, 
        location: str, 
        radius: int = 10000, 
        limit: int = 20,
        sort_by: str = "distance"
    ) -> List[HardwareStore]:
        """
        Search for hardware stores near a given location.
        
        Args:
            location: Address or location to search from
            radius: Search radius in meters (default: 10000)
            limit: Maximum number of results (default: 20)
            sort_by: Sort results by distance, rating, or review_count
            
        Returns:
            List of HardwareStore objects
        """
        # Hardware store related terms
        hardware_terms = [
            "hardware store", "home improvement", "tools", "lumber",
            "building supplies", "electrical supplies", "plumbing supplies",
            "paint", "hardware", "construction supplies"
        ]
        
        # Combine terms for better search results
        search_term = "+".join(hardware_terms[:3])  # Use first 3 terms
        
        params = {
            "term": search_term,
            "location": location,
            "radius": radius,
            "limit": limit,
            "sort_by": sort_by,
            "categories": "hardware,homeandgarden"
        }
        
        try:
            response = requests.get(
                f"{self.base_url}/businesses/search",
                headers=self.headers,
                params=params
            )
            response.raise_for_status()
            
            data = response.json()
            businesses = data.get("businesses", [])
            
            hardware_stores = []
            for business in businesses:
                # Filter for hardware-related businesses
                if self._is_hardware_store(business):
                    store = self._parse_business(business)
                    hardware_stores.append(store)
            
            return hardware_stores
            
        except requests.exceptions.RequestException as e:
            print(f"Error calling Yelp API: {e}")
            return []
    
    def _is_hardware_store(self, business: Dict) -> bool:
        """Check if a business is a hardware store based on categories."""
        categories = business.get("categories", [])
        hardware_keywords = [
            "hardware", "home improvement", "building supplies", 
            "tools", "lumber", "electrical", "plumbing", "paint"
        ]
        
        for category in categories:
            category_title = category.get("title", "").lower()
            if any(keyword in category_title for keyword in hardware_keywords):
                return True
        
        return False
    
    def _parse_business(self, business: Dict) -> HardwareStore:
        """Parse Yelp business data into HardwareStore object."""
        location = business.get("location", {})
        coordinates = business.get("coordinates", {})
        
        # Extract categories
        categories = [cat.get("title", "") for cat in business.get("categories", [])]
        
        return HardwareStore(
            name=business.get("name", ""),
            address=" ".join(location.get("display_address", [])),
            city=location.get("city", ""),
            state=location.get("state", ""),
            zip_code=location.get("zip_code", ""),
            phone=business.get("display_phone", ""),
            rating=business.get("rating", 0.0),
            review_count=business.get("review_count", 0),
            distance=business.get("distance", 0.0) / 1609.34,  # Convert meters to miles
            url=business.get("url", ""),
            categories=categories
        )
    
    def get_business_details(self, business_id: str) -> Optional[Dict]:
        """Get detailed information about a specific business."""
        try:
            response = requests.get(
                f"{self.base_url}/businesses/{business_id}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error getting business details: {e}")
            return None

