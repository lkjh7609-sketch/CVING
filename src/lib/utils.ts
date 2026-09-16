import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import JSZip from 'jszip';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function countCharacters(text: string, includeSpaces = true): number {
  if (!text) return 0;
  if (includeSpaces) {
    return text.length;
  }
  return text.replace(/\s+/g, '').length;
}

export function downloadFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadZip(
  files: { filename: string; content: string }[],
  zipFilename = '자기소개서_일괄다운로드.zip'
) {
  const zip = new JSZip();
  files.forEach(({ filename, content }) => {
    zip.file(filename, content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatDate(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Smart fetch that routes external URLs through Vite dev proxy (/api/proxy)
 * to bypass browser CORS limitations with API gateways like AIApiFlow.
 */
export async function smartFetch(url: string, init?: RequestInit): Promise<Response> {
  const isBrowser = typeof window !== 'undefined';
  const isExternal = url.startsWith('http://') || url.startsWith('https://');

  if (isBrowser && isExternal) {
    try {
      const headers = new Headers(init?.headers || {});
      headers.set('x-target-url', url);

      const proxyRes = await fetch('/api/proxy', {
        ...init,
        headers,
      });

      // If proxy server handled it (not a 404 from non-existent route), return it
      if (proxyRes.status !== 404) {
        return proxyRes;
      }
    } catch (proxyErr) {
      console.warn('[smartFetch] Proxy attempt failed, falling back to direct fetch:', proxyErr);
    }
  }

  return fetch(url, init);
}
