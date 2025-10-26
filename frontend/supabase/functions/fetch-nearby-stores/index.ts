import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, storeTypes } = await req.json();
    const YELP_API_KEY = Deno.env.get("YELP_API_KEY");
    
    if (!YELP_API_KEY) {
      throw new Error("YELP_API_KEY is not configured");
    }

    const allStores: any[] = [];
    const uniqueStores = new Set<string>();

    // Map store types to Yelp categories - using correct Yelp category aliases
    const categoryMap: Record<string, string> = {
      'hardware': 'hardware',
      'hardware store': 'hardware',
      'home improvement': 'buildingsupplies',
      'home and garden': 'nurserysgardening',
      'electronics': 'electronics',
      'stationery': 'stationery',
      'building supplies': 'buildingsupplies',
      'lumber yard': 'buildingsupplies',
    };

    for (const storeType of storeTypes) {
      const normalizedType = storeType.toLowerCase();
      const category = categoryMap[normalizedType] || 'hardware';
      
      // Use term parameter to further filter results
      const searchTerm = normalizedType.includes('hardware') || normalizedType.includes('lumber') 
        ? 'hardware store' 
        : storeType;
      
      const yelpUrl = `https://api.yelp.com/v3/businesses/search?latitude=${latitude}&longitude=${longitude}&categories=${category}&term=${encodeURIComponent(searchTerm)}&limit=5&sort_by=distance`;
      
      const response = await fetch(yelpUrl, {
        headers: {
          'Authorization': `Bearer ${YELP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Yelp API error for ${storeType}:`, response.status);
        continue;
      }

      const data = await response.json();
      
      data.businesses?.forEach((business: any) => {
        if (!uniqueStores.has(business.id)) {
          uniqueStores.add(business.id);
          allStores.push({
            id: business.id,
            name: business.name,
            address: business.location.display_address.join(', '),
            storeType: storeType,
            rating: business.rating,
            distance: business.distance ? `${(business.distance / 1609.34).toFixed(1)} mi` : 'N/A',
            phone: business.phone,
            url: business.url,
          });
        }
      });
    }

    return new Response(JSON.stringify({ stores: allStores }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
