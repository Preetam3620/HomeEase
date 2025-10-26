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
    const { taskDetails, category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a helpful DIY task planner. Generate detailed DIY plans with steps, tools, and materials needed."
          },
          {
            role: "user",
            content: `Generate a comprehensive DIY plan for this task:\n\nCategory: ${category}\nTask Details: ${taskDetails}\n\nProvide the response in the following JSON format:\n{\n  "steps": ["step 1", "step 2", ...],\n  "toolsAndMaterials": [\n    {\n      "name": "tool/material name",\n      "estimatedCost": "cost range in USD",\n      "quantity": "quantity needed",\n      "storeType": "type of store (hardware, home improvement, electronics, etc.)"\n    }\n  ]\n}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_diy_plan",
              description: "Generate a comprehensive DIY plan with steps and required tools/materials",
              parameters: {
                type: "object",
                properties: {
                  steps: {
                    type: "array",
                    items: { type: "string" },
                    description: "Step-by-step instructions"
                  },
                  toolsAndMaterials: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        estimatedCost: { type: "string" },
                        quantity: { type: "string" },
                        storeType: { type: "string" }
                      },
                      required: ["name", "estimatedCost", "quantity", "storeType"]
                    }
                  }
                },
                required: ["steps", "toolsAndMaterials"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_diy_plan" } }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI gateway error:", response.status, error);
      throw new Error("Failed to generate plan");
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function.arguments) {
      throw new Error("Failed to generate structured plan");
    }
    
    const plan = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ plan }), {
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
