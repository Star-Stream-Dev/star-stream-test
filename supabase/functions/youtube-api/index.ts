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
    const YOUTUBE_API_KEY = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      throw new Error('YouTube API key not configured');
    }

    const { action, query, videoId, maxResults = 20, pageToken, categoryId } = await req.json();

    let url = '';
    
    switch (action) {
      case 'search':
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
        break;
      
      case 'trending':
        url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=US&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}${categoryId ? `&videoCategoryId=${categoryId}` : ''}${pageToken ? `&pageToken=${pageToken}` : ''}`;
        break;
      
      case 'shorts':
        // Search for short-form videos
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query || 'shorts'}&type=video&videoDuration=short&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
        break;
      
      case 'video':
        url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
        break;
      
      case 'related':
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&relatedToVideoId=${videoId}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
        break;
      
      case 'categories':
        url = `https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=US&key=${YOUTUBE_API_KEY}`;
        break;
      
      case 'channel':
        url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${query}&key=${YOUTUBE_API_KEY}`;
        break;
      
      default:
        throw new Error('Invalid action');
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'YouTube API error');
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('YouTube API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
