import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, fileId, fileName, fileBase64, folderId } = body

    if (action !== 'delete' && (!fileName || !fileBase64)) {
      return new Response(
        JSON.stringify({ error: 'fileName and fileBase64 are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let access_token = ''

    // Try using User OAuth2 Refresh Token (Best for Personal Gmail with 15GB quota)
    const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN')
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (refreshToken && clientId && clientSecret) {
      console.log("Authenticating using User Refresh Token...")
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Failed to refresh user token: ${errText}`)
      }

      const tokenData = await response.json()
      access_token = tokenData.access_token
    } else {
      // Fallback to Service Account (Only works on Google Workspace Shared Drives)
      console.log("No Refresh Token secrets found. Falling back to Service Account...")
      const serviceAccountKeyJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')
      if (!serviceAccountKeyJson) {
        throw new Error('Missing authentication configuration. Please set GOOGLE_REFRESH_TOKEN or GOOGLE_SERVICE_ACCOUNT_KEY.')
      }

      const credentials = JSON.parse(serviceAccountKeyJson)
      const tokenUrl = 'https://oauth2.googleapis.com/token'
      const header = { alg: 'RS256', typ: 'JWT' }
      const now = Math.floor(Date.now() / 1000)
      const claimSet = {
        iss: credentials.client_email,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
        aud: tokenUrl,
        exp: now + 3600,
        iat: now,
      }

      const pemHeader = "-----BEGIN PRIVATE KEY-----"
      const pemFooter = "-----END PRIVATE KEY-----"
      const rawPem = credentials.private_key
        .replace(pemHeader, "")
        .replace(pemFooter, "")
        .replace(/\s/g, "")
      
      const binaryKey = Uint8Array.from(atob(rawPem), c => c.charCodeAt(0))
      const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        binaryKey,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      )

      const encoder = new TextEncoder()
      const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
      const encodedClaimSet = btoa(JSON.stringify(claimSet)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
      const tokenInput = `${encodedHeader}.${encodedClaimSet}`
      
      const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        privateKey,
        encoder.encode(tokenInput)
      )
      
      const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
      
      const jwt = `${tokenInput}.${encodedSignature}`

      const oauthResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      })

      if (!oauthResponse.ok) {
        const errText = await oauthResponse.text()
        throw new Error(`Google OAuth Service Account failure: ${errText}`)
      }

      const oauthData = await oauthResponse.json()
      access_token = oauthData.access_token
    }

    if (action === 'delete') {
      if (!fileId) {
        throw new Error('fileId is required for deletion')
      }
      console.log(`Deleting file with ID: ${fileId}...`)
      const deleteResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${access_token}`,
        }
      })
      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const errText = await deleteResponse.text()
        throw new Error(`Google Drive API Delete failure: ${errText}`)
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Upload file metadata and media content
    const encoder = new TextEncoder()
    const metadata = {
      name: fileName,
      parents: folderId ? [folderId] : [],
    }

    const boundary = 'foo_bar_baz'
    const multipartBody = new Uint8Array([
      ...encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: image/jpeg\r\nContent-Transfer-Encoding: base64\r\n\r\n`),
      ...encoder.encode(fileBase64),
      ...encoder.encode(`\r\n--${boundary}--`)
    ])

    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    })

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text()
      throw new Error(`Google Drive API Upload failure: ${errText}`)
    }

    const fileData = await uploadResponse.json()
    const uploadedFileId = fileData.id

    // 5. Make the file publicly viewable
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadedFileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    })

    const publicUrl = `https://lh3.googleusercontent.com/d/${uploadedFileId}`

    return new Response(
      JSON.stringify({ url: publicUrl, id: uploadedFileId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("EDGE FUNCTION RUNTIME ERROR:", error);
    return new Response(
      JSON.stringify({ error: error.message || error }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
