import { createWorker } from 'tesseract.js';
import { ApiProvider } from '@/lib/types';
import { smartFetch } from '@/lib/utils';

export interface OCRProgressCallback {
  (progress: number, statusText: string): void;
}

/**
 * Preprocesses image using HTML5 Canvas to enhance OCR accuracy:
 * - Resizes if excessively large
 * - Converts to grayscale
 * - Boosts contrast
 */
export async function preprocessImage(imageSource: string | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Limit max dimension to 2500px to maintain speed while preserving text sharpness
      const maxDim = 2500;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
      }

      ctx.drawImage(img, 0, 0, width, height);

      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        const d = imgData.data;

        // Grayscale + Contrast adjustment
        // Contrast factor: 1.2
        const contrast = 1.25;
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

        for (let i = 0; i < d.length; i += 4) {
          // Grayscale luminance formula (Rec. 709)
          const gray = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
          const adjusted = factor * (gray - 128) + 128;
          const clamped = Math.min(255, Math.max(0, adjusted));

          d[i] = clamped;
          d[i + 1] = clamped;
          d[i + 2] = clamped;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        // Fallback to original image if getImageData has any security / CORS issue
        resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
      }
    };

    img.onerror = () => {
      reject(new Error('이미지를 불러오는데 실패했습니다.'));
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    }
  });
}

class OCRService {
  /**
   * Performs client-side OCR using Tesseract.js (kor+eng)
   */
  async recognize(
    imageSource: string | File,
    onProgress?: OCRProgressCallback
  ): Promise<string> {
    try {
      onProgress?.(5, '이미지 전처리 중...');
      const processedImageUrl = await preprocessImage(imageSource);

      onProgress?.(15, 'OCR 엔진 로딩 중 (한글/영어)...');
      const worker = await createWorker(['kor', 'eng'], 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.min(99, Math.round(20 + m.progress * 78));
            onProgress?.(pct, `텍스트 인식 중... ${Math.round(m.progress * 100)}%`);
          } else if (m.status) {
            onProgress?.(20, `${m.status}...`);
          }
        },
      });

      const ret = await worker.recognize(processedImageUrl);
      await worker.terminate();

      onProgress?.(100, '인식 완료');

      // Basic cleanup: remove excessive empty lines
      const cleanText = ret.data.text
        .split('\n')
        .map((line) => line.trim())
        .filter((line, i, arr) => line.length > 0 || (i > 0 && arr[i - 1].length > 0))
        .join('\n');

      return cleanText;
    } catch (error: any) {
      console.error('OCR Recognition failed:', error);
      throw new Error(error?.message || 'OCR 텍스트 인식에 실패했습니다.');
    }
  }

  /**
   * Multimodal AI Vision API option (Gemini, Claude, OpenAI)
   */
  async recognizeWithVisionApi(
    base64Image: string,
    apiKey: string,
    endpoint = 'https://generativelanguage.googleapis.com',
    provider: ApiProvider = 'gemini',
    model?: string
  ): Promise<string> {
    if (!apiKey) {
      throw new Error('Vision API를 사용하려면 API Key가 필요합니다.');
    }

    let mimeType = 'image/png';
    let base64DataOnly = base64Image;
    if (base64Image.startsWith('data:')) {
      const matches = base64Image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64DataOnly = matches[2];
      }
    }

    const promptText =
      '이 채용 공고 이미지에서 채용 포지션, 주요 업무, 자격 요건, 우대 사항, 그리고 자기소개서 문항이 있다면 해당 내용을 빠짐없이 텍스트로 정확히 추출해줘. 불필요한 인사말이나 서두/결미 없이 오직 추출된 본문 내용만 일목요연하게 출력해줘.';

    const isAnthropic =
      provider === 'anthropic' ||
      model?.toLowerCase().includes('claude') ||
      endpoint.includes('anthropic') ||
      endpoint.includes('aiapiflow');

    const isGemini =
      provider === 'gemini' ||
      model?.toLowerCase().includes('gemini') ||
      endpoint.includes('googleapis.com');

    // 1. Google Gemini Vision (gemini-3.8-flash, gemini-2.0-flash, etc.)
    if (isGemini) {
      const targetModel = model?.trim() || 'gemini-3.8-flash';
      const geminiPayload = {
        model: targetModel,
        contents: [
          {
            role: 'user',
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64DataOnly,
                },
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.2,
        },
      };

      let response: Response;
      try {
        response = await fetch('/api/gemini/generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
            'x-base-url': endpoint,
          },
          body: JSON.stringify(geminiPayload),
        });
        if (response.status === 404) {
          throw new Error('Proxy 404');
        }
      } catch {
        const directUrl = `${endpoint.replace(/\/+$/, '')}/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;
        response = await fetch(directUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(geminiPayload),
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        let errMsg = errData?.error?.message || `Gemini Vision API 호출 실패 (${response.status})`;
        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
          errMsg = 'Google Gemini API 키가 올바르지 않습니다. AI Studio에서 발급받은 키를 확인해주세요.';
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // 2. Anthropic Claude Vision (Claude-sonnet-5)
    if (isAnthropic) {
      const targetModel = model?.trim() || 'claude-sonnet-5';
      const response = await fetch('/api/anthropic/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
          'x-base-url': endpoint,
        },
        body: JSON.stringify({
          model: targetModel,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: base64DataOnly,
                  },
                },
                {
                  type: 'text',
                  text: promptText,
                },
              ],
            },
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Anthropic Vision 호출 실패 (${response.status})`);
      }

      const data = await response.json();
      return data.content?.[0]?.text || '';
    }

    // 3. OpenAI Vision (gpt-4o)
    let response: Response;
    try {
      response = await fetch('/api/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
          'x-base-url': endpoint,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: promptText,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image,
                  },
                },
              ],
            },
          ],
          max_tokens: 4096,
        }),
      });
      if (response.status === 404) {
        throw new Error('Proxy 404');
      }
    } catch {
      let url = endpoint.replace(/\/+$/, '');
      if (url.endsWith('/chat/completions')) {
        // as-is
      } else if (url.endsWith('/v1')) {
        url = `${url}/chat/completions`;
      } else {
        url = `${url}/v1/chat/completions`;
      }

      response = await smartFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: promptText,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image,
                  },
                },
              ],
            },
          ],
          max_tokens: 4096,
        }),
      });
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `OpenAI Vision API 호출 실패 (${response.status})`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

export const ocrService = new OCRService();
