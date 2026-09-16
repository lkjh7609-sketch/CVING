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
      rawAuth.replace(/^Bearer\s+/i, '').trim() ||
      req.headers['api-key'] ||
      '';

    let baseURL =
      req.headers['x-base-url'] ||
      req.body?.baseURL ||
      'https://api.openai.com/v1';

    baseURL = baseURL.replace(/\/+$/, '');
    let targetUrl = '';
    if (baseURL.endsWith('/chat/completions')) {
      targetUrl = baseURL;
    } else if (baseURL.endsWith('/v1')) {
      targetUrl = `${baseURL}/chat/completions`;
    } else {
      targetUrl = `${baseURL}/v1/chat/completions`;
    }

    const headers = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });

    if (req.body?.stream && upstreamRes.ok) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
      });

      if (upstreamRes.body) {
        const reader = upstreamRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } else {
      let data = await upstreamRes.text();
      if (data.includes('<!DOCTYPE') || data.includes('Just a moment') || data.includes('Cloudflare')) {
        data = JSON.stringify({
          error: {
            message:
              '게이트웨이의 Cloudflare 봇 방화벽(403)에 의해 차단되었습니다. 공식 OpenAI API 키를 사용하시거나 Google Gemini를 이용해주세요.',
            status: upstreamRes.status,
          },
        });
      }
      res.writeHead(upstreamRes.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(data);
    }
  } catch (err) {
    console.error('[OpenAI Proxy Error]:', err);
    return res.status(500).json({ error: { message: err.message || 'OpenAI 프록시 오류' } });
  }
}
