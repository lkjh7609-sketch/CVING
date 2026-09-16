export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const targetUrl = req.headers['x-target-url'];
    if (!targetUrl) {
      return res.status(400).json({ error: { message: 'Missing x-target-url header' } });
    }

    const rawAuth = req.headers['authorization'] || '';
    const headers = {
      'Content-Type': 'application/json',
    };
    if (rawAuth) {
      headers['Authorization'] = rawAuth;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const resData = await upstreamRes.text();
    res.writeHead(upstreamRes.status, {
      'Content-Type': upstreamRes.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(resData);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message || 'Proxy error' } });
  }
}
