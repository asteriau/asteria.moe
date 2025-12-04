import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const trackId = url.searchParams.get('trackId');
    const artist = url.searchParams.get('artist');
    const song = url.searchParams.get('song');
    const album = url.searchParams.get('album');

    if (!artist || !song) {
      return new Response(
        JSON.stringify({ error: 'Artist and song parameters are required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Fetch lyrics from LRCLIB API
    const lrclibUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(song)}${album ? `&album_name=${encodeURIComponent(album)}` : ''}`;
    
    const response = await fetch(lrclibUrl);
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Lyrics not found' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({
        syncedLyrics: data.syncedLyrics,
        plainLyrics: data.plainLyrics,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});