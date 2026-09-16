import React, { useState, useRef, useEffect } from 'react';
import { Company } from '@/lib/types';
import { ocrService } from '@/services/ocrService';
import { useCompanyStore } from '@/stores/companyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowDownToLine,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface OCRProcessorProps {
  company: Company;
  onApplyToJobPosting: (extractedText: string) => void;
}

export const OCRProcessor: React.FC<OCRProcessorProps> = ({
  company,
  onApplyToJobPosting,
}) => {
  const { setCompanyScreenshot, removeCompanyScreenshot, updateCompany } = useCompanyStore();
  const { settings } = useSettingsStore();

  const [isDragging, setIsDragging] = useState(false);
  const [ocrText, setOcrText] = useState(company.ocrText || '');
  const [statusMessage, setStatusMessage] = useState('');
  const [useVisionApi, setUseVisionApi] = useState(Boolean(settings.apiKey));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (company.ocrText) {
      setOcrText(company.ocrText);
    }
  }, [company.ocrText]);

  const getVisionProviderInfo = () => {
    if (settings.provider === 'gemini') {
      const modelName = settings.model || 'gemini-3.8-flash';
      return {
        name: `Google Gemini (${modelName})`,
        badge: `Gemini Vision (${modelName}) 정밀 분석`,
      };
    }
    if (settings.provider === 'anthropic') {
      const modelName = settings.model || 'Claude Sonnet';
      return {
        name: `Claude (${modelName})`,
        badge: `Claude Vision (${modelName}) 정밀 분석`,
      };
    }
    const modelName = settings.model || 'gpt-4o';
    return {
      name: `OpenAI (${modelName})`,
      badge: `OpenAI Vision (${modelName}) 정밀 분석`,
    };
  };

  // Handle image file selection
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일(PNG, JPG, WebP 등)만 업로드 가능합니다.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('이미지 파일 크기는 15MB 이하만 가능합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      await setCompanyScreenshot(company.id, dataUrl);
      // Auto-trigger OCR as specified in the work plan ("업로드 즉시 자동 OCR 시작")
      runOCR(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Run OCR
  const runOCR = async (imageSrc?: string) => {
    const src = imageSrc || company.screenshotDataUrl;
    if (!src) return;

    updateCompany(company.id, {
      ocrStatus: 'processing',
      ocrProgress: 0,
      ocrError: undefined,
    });
    setStatusMessage('OCR 처리 준비 중...');

    try {
      if (useVisionApi && settings.apiKey) {
        const { name } = getVisionProviderInfo();
        setStatusMessage(`${name} 멀티모달 비전으로 공고 텍스트 정밀 분석 중...`);
        const text = await ocrService.recognizeWithVisionApi(
          src,
          settings.apiKey,
          settings.apiEndpoint,
          settings.provider,
          settings.model
        );
        setOcrText(text);
        updateCompany(company.id, {
          ocrStatus: 'success',
          ocrProgress: 100,
          ocrText: text,
        });
        setStatusMessage(`${name} 텍스트 추출 완료!`);
      } else {
        const text = await ocrService.recognize(src, (progress, statusText) => {
          setStatusMessage(statusText);
          updateCompany(company.id, { ocrProgress: progress });
        });

        setOcrText(text);
        updateCompany(company.id, {
          ocrStatus: 'success',
          ocrProgress: 100,
          ocrText: text,
        });
        setStatusMessage('클라이언트 OCR 추출 완료!');
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || '텍스트 추출에 실패했습니다.';
      updateCompany(company.id, {
        ocrStatus: 'failed',
        ocrError: errMsg,
      });
      setStatusMessage(errMsg);
    }
  };

  // Clipboard paste listener
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleFile(file);
          break;
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onPaste={handlePaste}
      tabIndex={0}
      className="bg-zinc-50/50 border border-zinc-200 rounded-xl p-3 sm:p-4 focus:outline-none focus:ring-1 focus:ring-zinc-400"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-zinc-600 shrink-0" />
          <span className="text-xs font-semibold text-zinc-900">
            공고 스크린샷 캡처 및 텍스트 자동 추출 (OCR)
          </span>
        </div>

        {/* Vision API toggle if key exists */}
        {settings.apiKey ? (
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none bg-white hover:bg-zinc-50 border border-zinc-200 px-2 sm:px-2.5 py-1 rounded-lg transition-colors shadow-2xs self-start sm:self-auto">
            <input
              type="checkbox"
              checked={useVisionApi}
              onChange={(e) => setUseVisionApi(e.target.checked)}
              className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-3.5 h-3.5"
            />
            <span className="font-medium text-[10px] sm:text-[11px] text-zinc-800">
              {getVisionProviderInfo().badge}
            </span>
          </label>
        ) : (
          <span className="text-[10px] sm:text-[11px] text-zinc-400">클라이언트 OCR 엔진 (Tesseract)</span>
        )}
      </div>

      {/* Upload Zone if no image */}
      {!company.screenshotDataUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-zinc-900 bg-zinc-100/80 scale-[0.99]'
              : 'border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
            }}
          />
          <div className="flex flex-col items-center justify-center gap-2 text-zinc-600">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center border border-zinc-200/60">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-semibold text-zinc-900 hover:underline">
                클릭하여 이미지 업로드
              </span>
              <span> 또는 이미지를 여기로 드래그 & 드롭</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-zinc-400">
              화면 캡처 후 <b>Ctrl+V (Cmd+V)</b>로 바로 붙여넣기도 가능합니다.
            </p>
          </div>
        </div>
      ) : (
        /* Image Preview & OCR Operations */
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 bg-white p-3 rounded-lg border border-zinc-200">
            {/* Thumbnail */}
            <div className="relative group w-full sm:w-44 h-36 sm:h-32 bg-zinc-100 rounded-lg overflow-hidden shrink-0 border border-zinc-200">
              <img
                src={company.screenshotDataUrl}
                alt="공고 스크린샷"
                className="w-full h-full object-cover object-top"
              />
              <button
                type="button"
                onClick={() => removeCompanyScreenshot(company.id)}
                className="absolute top-1.5 right-1.5 p-1 bg-zinc-900 text-white rounded-md opacity-80 hover:opacity-100 shadow-sm transition-opacity"
                title="스크린샷 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* OCR Status and actions */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-zinc-700">추출 상태:</span>
                  {company.ocrStatus === 'processing' && (
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-700 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-900" /> {statusMessage || '처리 중...'}
                    </span>
                  )}
                  {company.ocrStatus === 'success' && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> 추출 완료
                    </span>
                  )}
                  {company.ocrStatus === 'failed' && (
                    <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> 실패
                    </span>
                  )}
                  {company.ocrStatus === 'idle' && (
                    <span className="text-xs text-zinc-400">대기 중</span>
                  )}
                </div>

                {/* Progress bar */}
                {company.ocrStatus === 'processing' && (
                  <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden mb-2 border border-zinc-200/50">
                    <div
                      className="bg-zinc-900 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${company.ocrProgress || 10}%` }}
                    />
                  </div>
                )}

                {company.ocrError && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded mb-2">
                    {company.ocrError}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  disabled={company.ocrStatus === 'processing'}
                  onClick={() => runOCR()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors font-medium border border-zinc-200 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      company.ocrStatus === 'processing' ? 'animate-spin' : ''
                    }`}
                  />
                  재추출
                </button>
              </div>
            </div>
          </div>

          {/* OCR Result Text Editor (수동 보정 가능) */}
          {ocrText && (
            <div className="space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-zinc-600">
                <span className="font-medium">추출된 텍스트 확인 및 수동 보정:</span>
                <button
                  type="button"
                  onClick={() => onApplyToJobPosting(ocrText)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 font-medium transition-colors text-xs shadow-2xs"
                  title="추출된 텍스트를 위 공고 본문 입력창에 자동 추가합니다"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" /> 공고 본문에 반영하기
                </button>
              </div>
              <textarea
                value={ocrText}
                onChange={(e) => {
                  setOcrText(e.target.value);
                  updateCompany(company.id, { ocrText: e.target.value });
                }}
                rows={4}
                className="w-full p-2.5 text-xs text-zinc-800 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono"
                placeholder="추출된 공고 내용이 여기에 표시됩니다. 잘못 인식된 글자는 직접 수정할 수 있습니다."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
