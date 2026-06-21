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
    const { code, redirectUri, action } = await req.json()

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error("Missing Google OAuth credentials in environment")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'refresh') {
      // Handle refreshing the access token
      const { data: syncState } = await supabaseAdmin
        .from('sync_state')
        .select('value')
        .eq('key', 'youtube_refresh_token')
        .single()

      if (!syncState?.value) {
        throw new Error("No refresh token stored")
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: syncState.value,
          grant_type: 'refresh_token',
        }),
      })

      const tokenData = await tokenResponse.json()
      if (!tokenResponse.ok) {
        console.error("Token refresh failed:", tokenData)
        throw new Error(`Token refresh failed: ${tokenData.error_description || tokenData.error}`)
      }

      return new Response(
        JSON.stringify({
          access_token: tokenData.access_token,
          expires_in: tokenData.expires_in,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Otherwise handle the authorization code exchange
    if (!code || !redirectUri) {
      throw new Error("Missing 'code' or 'redirectUri'")
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
    if (refresh_token) {
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
