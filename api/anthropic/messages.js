import Anthropic from '@anthropic-ai/sdk';

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
      req.headers['x-api-key'] ||
      '';

    let baseURL =
      req.headers['x-base-url'] ||
      req.body?.baseURL ||
      'https://api.anthropic.com/v1';

    baseURL = baseURL.replace(/\/+$/, '');
    if (baseURL.endsWith('/v1')) {
      baseURL = baseURL.slice(0, -3);
    } else if (baseURL.endsWith('/v1/messages')) {
      baseURL = baseURL.slice(0, -12);
    } else if (baseURL.endsWith('/messages')) {
      baseURL = baseURL.slice(0, -9);
    }

    const client = new Anthropic({
      apiKey,
      baseURL,
      timeout: 120000,
      maxRetries: 1,
    });

    const { model, max_tokens, messages, system, temperature, stream } = req.body || {};

    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
      });

      try {
        const anthropicStream = await client.messages.create({
          model: model || 'claude-sonnet-5',
          max_tokens: max_tokens || 4096,
          messages: messages || [{ role: 'user', content: 'hi' }],
          ...(system ? { system } : {}),
          ...(temperature !== undefined ? { temperature } : {}),
          stream: true,
        });

        for await (const chunk of anthropicStream) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (streamErr) {
        console.error('[Anthropic Stream Error]:', streamErr);
        const status = streamErr?.status || 500;
        const message =
          streamErr?.error?.error?.message ||
          streamErr?.error?.message ||
          streamErr?.message ||
          '스트리밍 호출 실패';
        res.write(`data: ${JSON.stringify({ error: { message, status } })}\n\n`);
        res.end();
      }
    } else {
      const result = await client.messages.create({
        model: model || 'claude-sonnet-5',
        max_tokens: max_tokens || 4096,
        messages: messages || [{ role: 'user', content: 'hi' }],
        ...(system ? { system } : {}),
        ...(temperature !== undefined ? { temperature } : {}),
      });
      return res.status(200).json(result);
    }
  } catch (err) {
    console.error('[Anthropic Serverless Error]:', err);
    return res.status(500).json({ error: { message: err.message || 'Server error' } });
  }
}
