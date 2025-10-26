import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { category_slug, details, slot_start, slot_end, location, latitude, longitude } = await req.json();

    // Get category ID from slug
    const { data: category, error: categoryError } = await supabaseClient
      .from('categories')
      .select('id')
      .eq('slug', category_slug)
      .single();

    if (categoryError || !category) {
      throw new Error('Invalid category');
    }

    // Create the job
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .insert({
        user_id: user.id,
        category_id: category.id,
        details,
        slot_start,
        slot_end,
        latitude,
        longitude,
        status: 'DRAFT'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      throw new Error('Failed to create service request');
    }

    console.log('Job created successfully:', job);

    return new Response(
      JSON.stringify({ success: true, job }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
