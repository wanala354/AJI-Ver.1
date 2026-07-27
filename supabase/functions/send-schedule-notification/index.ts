import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    // 1. Parsing data webhook yang dikirim oleh Supabase
    const { record } = await req.json();
    
    const jenis = record.jenis_pengajian || "Pengajian";
    const tanggal = record.tanggal || "";
    const waktu = record.waktu_mulai || "";
    
    // 2. Buat Supabase Client untuk mengambil Token Perangkat
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Ambil seluruh token perangkat dari tabel user_device_tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('user_device_tokens')
      .select('device_token');
      
    if (tokenError || !tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: "Tidak ada token perangkat terdaftar." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const deviceTokens = tokens.map((t) => t.device_token);

    // 3. Ambil Firebase Secret dari Supabase Settings
    const firebaseConfigString = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!firebaseConfigString) {
      return new Response(JSON.stringify({ error: "Secret FIREBASE_SERVICE_ACCOUNT belum dikonfigurasi di Supabase." }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }

    const firebaseConfig = JSON.parse(firebaseConfigString);
    const accessToken = await getAccessToken(firebaseConfig);

    // 4. Kirim notifikasi ke setiap perangkat
    const projectId = firebaseConfig.project_id;
    const sendPromises = deviceTokens.map(async (token) => {
      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
      const messagePayload = {
        message: {
          token: token,
          notification: {
            title: "Jadwal Pengajian Baru!",
            body: `Ada pengajian ${jenis} hari ini tanggal ${tanggal} pukul ${waktu}. Silakan cek aplikasi.`,
          },
          android: {
            notification: {
              channel_id: "aji_jadwal_reminder_channel"
            }
          }
        },
      };

      const res = await fetch(fcmUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagePayload),
      });
      
      const resBody = await res.json();
      console.log(`FCM Response for token ${token.substring(0, 10)}...: Status ${res.status}`, JSON.stringify(resBody));
      return res;
    });

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, sent_count: deviceTokens.length }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Fungsi pembantu untuk membuat Google Access Token menggunakan JWT & Web Crypto API
async function getAccessToken(config: any): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: config.private_key_id
  };

  const claimSet = {
    iss: config.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: exp,
    iat: iat
  };

  const privateKeyPem = config.private_key;
  const privateKey = await importPrivateKey(privateKeyPem);

  const encoder = new TextEncoder();
  const encodedHeader = b64url(encoder.encode(JSON.stringify(header)));
  const encodedClaimSet = b64url(encoder.encode(JSON.stringify(claimSet)));

  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;
  const signatureBytes = await window.crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    encoder.encode(signatureInput)
  );
  const signature = b64url(new Uint8Array(signatureBytes));

  const assertion = `${signatureInput}.${signature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
  });

  const tokenData = await tokenResponse.json();
  if (tokenData.error) {
    throw new Error(`Google OAuth error: ${tokenData.error_description || tokenData.error}`);
  }
  return tokenData.access_token;
}

function b64url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  
  const binary = atob(pemContents);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return await window.crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
}
