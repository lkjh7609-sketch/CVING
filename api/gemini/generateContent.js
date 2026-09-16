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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method Not Allowed' } });
  }

  try {
    const rawAuth = req.headers['authorization'] || '';
    const apiKey =
      req.headers['x-goog-api-key'] ||
      rawAuth.replace(/^Bearer\s+/i, '').trim() ||
      req.body?.apiKey ||
      '';

    let baseURL =
      req.headers['x-base-url'] ||
      req.body?.baseURL ||
      'https://generativelanguage.googleapis.com';
    baseURL = baseURL.replace(/\/+$/, '');

    const model = req.body?.model || 'gemini-3.8-flash';
    const targetUrl = `${baseURL}/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const upstreamRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: req.body?.contents,
        system_instruction: req.body?.system_instruction,
        generationConfig: req.body?.generationConfig,
      }),
    });

    const resData = await upstreamRes.text();
    res.writeHead(upstreamRes.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(resData);
  } catch (err) {
    console.error('[Gemini Request Error]:', err);
    return res.status(500).json({ error: { message: err.message || 'Gemini 요청 오류' } });
  }
}
