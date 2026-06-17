import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, redirectUri } = await req.json()

    if (!code || !redirectUri) {
      throw new Error("Missing 'code' or 'redirectUri'")
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error("Missing Google OAuth credentials in environment")
    }

    // 1. Exchange the code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenData)
      throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`)
    }

    const { access_token, refresh_token, expires_in } = tokenData

    // 2. Store the refresh token in sync_state table if one was provided
    // (Google only returns refresh_token on the first authorization or when prompt=consent)
    if (refresh_token) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const { error: dbError } = await supabaseAdmin
        .from('sync_state')
        .upsert({
          key: 'youtube_refresh_token',
          value: refresh_token,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })

      if (dbError) {
        console.error("Failed to store refresh token:", dbError)
        throw new Error("Failed to store refresh token")
      }
    }

    return new Response(
      JSON.stringify({
        access_token,
        expires_in,
        has_refresh_token: !!refresh_token
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error("Error in youtube-oauth-exchange:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
