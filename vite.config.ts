import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

function anthropicGatewayPlugin(): Plugin {
  return {
    name: 'anthropic-gateway-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          });
          res.end();
          return;
        }

        // Endpoint: /api/anthropic/messages
        if (req.url?.startsWith('/api/anthropic/messages') && req.method === 'POST') {
          try {
            // Read body
            let bodyStr = '';
            for await (const chunk of req) {
              bodyStr += chunk;
            }
            const body = JSON.parse(bodyStr || '{}');

            // Extract Auth & BaseURL (defaults to https://aiapiflow.com like Blogflow1)
            const rawAuth = (req.headers['authorization'] as string) || '';
            const apiKey =
              rawAuth.replace(/^Bearer\s+/i, '').trim() ||
              (req.headers['x-api-key'] as string) ||
              '';

            let baseURL =
              (req.headers['x-base-url'] as string) ||
              (body.baseURL as string) ||
              'https://aiapiflow.com';

            baseURL = baseURL.replace(/\/+$/, '');

            // Ensure baseURL does not end with /v1 or /messages for Anthropic SDK
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
              timeout: 300000,
              maxRetries: 1,
            });

            const model = body.model || 'claude-sonnet-5';
            const max_tokens = body.max_tokens || 4096;
            const messages = body.messages || [{ role: 'user', content: 'hi' }];
            const system = body.system;
            const temperature = body.temperature;

            if (body.stream) {
              // Real-time streaming via official Anthropic SDK
              res.writeHead(200, {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
              });

              try {
                const stream = await client.messages.create({
                  model,
                  max_tokens,
                  messages,
                  ...(system ? { system } : {}),
                  ...(temperature !== undefined ? { temperature } : {}),
                  stream: true,
                });

                for await (const chunk of stream) {
                  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                }
                res.write('data: [DONE]\n\n');
                res.end();
              } catch (streamErr: any) {
                console.error('[Anthropic Stream Error]:', streamErr);
                const status = streamErr?.status || 500;
                const message =
                  streamErr?.error?.error?.message ||
                  streamErr?.error?.message ||
                  streamErr?.message ||
                  '스트리밍 호출 실패';

                res.write(
                  `data: ${JSON.stringify({
                    error: { message, status },
                  })}\n\n`
                );
                res.end();
              }
            } else {
              // Non-streaming call (e.g. connection test)
              try {
                const result = await client.messages.create({
                  model,
                  max_tokens,
                  messages,
                  ...(system ? { system } : {}),
                  ...(temperature !== undefined ? { temperature } : {}),
                });

                res.writeHead(200, {
                  'Content-Type': 'application/json; charset=utf-8',
                  'Access-Control-Allow-Origin': '*',
                });
                res.end(JSON.stringify(result));
              } catch (err: any) {
                console.error('[Anthropic Request Error]:', err.status, err.message);
                const status = err?.status || 500;
                let message =
                  err?.error?.error?.message ||
                  err?.error?.message ||
                  err?.message ||
                  'AIApiFlow Gateway 호출 실패';

                if (message.includes('No available accounts')) {
                  message =
                    'AIApiFlow Gateway 서버 계정 풀 일시 소진 (No available accounts). AIApiFlow 측 계정 충전/복구 대기 중입니다.';
                }

                res.writeHead(status, {
                  'Content-Type': 'application/json; charset=utf-8',
                  'Access-Control-Allow-Origin': '*',
                });
                res.end(JSON.stringify({ error: { message, status } }));
              }
            }
          } catch (topErr: any) {
            res.writeHead(500, {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(
              JSON.stringify({
                error: { message: topErr.message || '서버 오류' },
              })
            );
          }
          return;
        }

        next();
      });
    },
  };
}

function geminiProxyPlugin(): Plugin {
  return {
    name: 'gemini-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Handle CORS preflight
        if (req.method === 'OPTIONS' && req.url?.startsWith('/api/gemini')) {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          });
          res.end();
          return;
        }

        // Endpoint 1: /api/gemini/stream (SSE streaming)
        if (req.url?.startsWith('/api/gemini/stream') && req.method === 'POST') {
          // Disable socket timeouts for long-form generation
          req.socket?.setTimeout(0);
          res.setTimeout?.(0);

          try {
            let bodyStr = '';
            for await (const chunk of req) {
              bodyStr += chunk;
            }
            const body = JSON.parse(bodyStr || '{}');

            const rawAuth = (req.headers['authorization'] as string) || '';
            const apiKey =
              (req.headers['x-goog-api-key'] as string) ||
              rawAuth.replace(/^Bearer\s+/i, '').trim() ||
              (body.apiKey as string) ||
              '';

            let baseURL =
              (req.headers['x-base-url'] as string) ||
              (body.baseURL as string) ||
              'https://generativelanguage.googleapis.com';
            baseURL = baseURL.replace(/\/+$/, '');

            const model = body.model || 'gemini-3.8-flash';
            const targetUrl = `${baseURL}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

            const upstreamRes = await fetch(targetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: body.contents,
                system_instruction: body.system_instruction,
                generationConfig: body.generationConfig,
                safetySettings: body.safetySettings || [
                  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                ],
              }),
            });

            if (!upstreamRes.ok) {
              const errText = await upstreamRes.text();
              console.error('[Gemini Stream Error]:', upstreamRes.status, errText);
              res.writeHead(upstreamRes.status, {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(errText);
              return;
            }

            res.writeHead(200, {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              'Connection': 'keep-alive',
              'X-Accel-Buffering': 'no',
              'Access-Control-Allow-Origin': '*',
            });

            // @ts-ignore
            if (typeof res.flushHeaders === 'function') {
              // @ts-ignore
              res.flushHeaders();
            }

            if (upstreamRes.body) {
              const reader = upstreamRes.body.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
                // @ts-ignore
                if (typeof res.flush === 'function') {
                  // @ts-ignore
                  res.flush();
                }
              }
            }
            res.write('data: [DONE]\n\n');
            res.end();
          } catch (err: any) {
            console.error('[Gemini Stream Catch]:', err);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify({ error: { message: err.message || 'Gemini 스트리밍 오류' } }));
            } else {
              res.write(`data: ${JSON.stringify({ error: { message: err.message || 'Gemini 스트리밍 오류' } })}\n\n`);
              res.end();
            }
          }
          return;
        }

        // Endpoint 2: /api/gemini/generateContent (non-streaming or test)
        if (req.url?.startsWith('/api/gemini/generateContent') && req.method === 'POST') {
          try {
            let bodyStr = '';
            for await (const chunk of req) {
              bodyStr += chunk;
            }
            const body = JSON.parse(bodyStr || '{}');

            const rawAuth = (req.headers['authorization'] as string) || '';
            const apiKey =
              (req.headers['x-goog-api-key'] as string) ||
              rawAuth.replace(/^Bearer\s+/i, '').trim() ||
              (body.apiKey as string) ||
              '';

            let baseURL =
              (req.headers['x-base-url'] as string) ||
              (body.baseURL as string) ||
              'https://generativelanguage.googleapis.com';
            baseURL = baseURL.replace(/\/+$/, '');

            const model = body.model || 'gemini-3.8-flash';
            const targetUrl = `${baseURL}/v1beta/models/${model}:generateContent?key=${apiKey}`;

            const upstreamRes = await fetch(targetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: body.contents,
                system_instruction: body.system_instruction,
                generationConfig: body.generationConfig,
              }),
            });

            const resData = await upstreamRes.text();
            res.writeHead(upstreamRes.status, {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(resData);
          } catch (err: any) {
            console.error('[Gemini Request Catch]:', err);
            res.writeHead(500, {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({ error: { message: err.message || 'Gemini 요청 오류' } }));
          }
          return;
        }

        next();
      });
    },
  };
}

function openaiProxyPlugin(): Plugin {
  return {
    name: 'openai-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Handle CORS preflight
        if (req.method === 'OPTIONS' && (req.url?.startsWith('/api/openai') || req.url?.startsWith('/api/proxy'))) {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          });
          res.end();
          return;
        }

        // Endpoint: /api/openai/chat/completions or /api/proxy
        const isOpenAiRoute = req.url?.startsWith('/api/openai');
        const isProxyRoute = req.url?.startsWith('/api/proxy');

        if ((isOpenAiRoute || isProxyRoute) && req.method === 'POST') {
          req.socket?.setTimeout(0);
          res.setTimeout?.(0);

          try {
            let bodyStr = '';
            for await (const chunk of req) {
              bodyStr += chunk;
            }
            const body = JSON.parse(bodyStr || '{}');

            let targetUrl = '';
            if (isProxyRoute) {
              targetUrl = (req.headers['x-target-url'] as string) || '';
            } else {
              let baseURL =
                (req.headers['x-base-url'] as string) ||
                (body.baseURL as string) ||
                'https://api.openai.com/v1';
              baseURL = baseURL.replace(/\/+$/, '');
              if (baseURL.endsWith('/chat/completions')) {
                targetUrl = baseURL;
              } else if (baseURL.endsWith('/v1')) {
                targetUrl = `${baseURL}/chat/completions`;
              } else {
                targetUrl = `${baseURL}/v1/chat/completions`;
              }
            }

            if (!targetUrl) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: { message: 'Missing target URL' } }));
              return;
            }

            const rawAuth = (req.headers['authorization'] as string) || '';
            const apiKey =
              rawAuth.replace(/^Bearer\s+/i, '').trim() ||
              (req.headers['api-key'] as string) ||
              '';

            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            if (apiKey) {
              headers['Authorization'] = `Bearer ${apiKey}`;
            }

            const upstreamRes = await fetch(targetUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(body),
            });

            if (body.stream && upstreamRes.ok) {
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
              const resData = await upstreamRes.text();
              res.writeHead(upstreamRes.status, {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(resData);
            }
          } catch (err: any) {
            console.error('[OpenAI Proxy Error]:', err);
            res.writeHead(500, {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({ error: { message: err.message || 'OpenAI 프록시 오류' } }));
          }
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), anthropicGatewayPlugin(), geminiProxyPlugin(), openaiProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
