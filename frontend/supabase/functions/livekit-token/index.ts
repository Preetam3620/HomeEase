import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY');
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const livekitUrl = Deno.env.get('LIVEKIT_URL');

    if (!livekitApiKey || !livekitApiSecret || !livekitUrl) {
      throw new Error('LiveKit credentials are not configured');
    }

    const { roomName, participantName } = await req.json();

    if (!roomName || !participantName) {
      throw new Error('Room name and participant name are required');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: livekitApiKey,
      sub: participantName,
      nbf: now,
      exp: now + 3600, // 1 hour expiration
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
      },
      metadata: JSON.stringify({
        participantName,
      }),
    };

    // Create crypto key from secret
    const keyData = new TextEncoder().encode(livekitApiSecret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const token = await create({ alg: 'HS256', typ: 'JWT' }, payload, key);

    console.log('LiveKit token generated for room:', roomName);

    return new Response(
      JSON.stringify({ 
        token,
        url: livekitUrl 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
