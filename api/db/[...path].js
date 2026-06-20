export default async function handler(req, res) {
  // Add CORS headers to allow cross-origin requests from GitHub Pages or Localhost
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, Authorization, prefer'
  );

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get the sub-path from query parameters
  const { path } = req.query;
  const subPath = Array.isArray(path) ? path.join('/') : path;

  // Real Supabase base URL and service key from environment variables on Vercel
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: "Missing Supabase configuration on proxy server." });
    return;
  }

  // Extract query string
  const urlObj = new URL(req.url, 'http://localhost');
  const queryString = urlObj.search;

  // Construct target Supabase REST URL
  const targetUrl = `${supabaseUrl}/${subPath}${queryString}`;

  // Copy headers from client request
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    // Avoid copying host, connection, or existing auth headers that might conflict
    if (!['host', 'connection', 'authorization', 'apikey'].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  }

  // Inject the real Supabase credentials
  headers['apikey'] = supabaseKey;
  headers['Authorization'] = `Bearer ${supabaseKey}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (req.body) {
        fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    // Forward status code
    res.status(response.status);

    // Forward headers from Supabase back to the client
    response.headers.forEach((value, key) => {
      // Exclude content-encoding and transfer-encoding to avoid body parsing conflicts
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const data = await response.text();
    res.send(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Proxy connection failed: " + error.message });
  }
}
