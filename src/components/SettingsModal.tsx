import React, { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useQuestionStore } from '@/stores/questionStore';
import { ApiProvider } from '@/lib/types';
import { smartFetch, countCharacters } from '@/lib/utils';
import {
  X,
  Key,
  Globe,
  Sliders,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Cpu,
  AlignLeft,
  Settings,
  Hash,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const { questions, updateQuestionMaxLength } = useQuestionStore();

  const [activeTab, setActiveTab] = useState<'api' | 'lengths'>('api');

  // API State
  const [provider, setProvider] = useState<ApiProvider>(settings.provider || 'anthropic');
  const [connectionType, setConnectionType] = useState<'official' | 'gateway'>(
    settings.connectionType || (settings.apiEndpoint?.includes('aiapiflow') ? 'gateway' : 'official')
  );
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [apiEndpoint, setApiEndpoint] = useState(settings.apiEndpoint);
  const [model, setModel] = useState(settings.model);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [isDemoMode, setIsDemoMode] = useState(settings.isDemoMode);
  const [showKey, setShowKey] = useState(false);

  // Question MaxLength State (Map of q.id -> maxLength)
  const [localLengths, setLocalLengths] = useState<Record<string, number>>({});

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Sync state when modal opens
  React.useEffect(() => {
    setProvider(settings.provider || 'anthropic');
    setConnectionType(
      settings.connectionType || (settings.apiEndpoint?.includes('aiapiflow') ? 'gateway' : 'official')
    );
    setApiKey(settings.apiKey);
    setApiEndpoint(settings.apiEndpoint);
    setModel(settings.model);
    setTemperature(settings.temperature);
    setIsDemoMode(settings.isDemoMode);
    setTestResult(null);

    const lengthMap: Record<string, number> = {};
    questions.forEach((q) => {
      lengthMap[q.id] = q.maxLength || 1000;
    });
    setLocalLengths(lengthMap);
  }, [isOpen, settings, questions]);

  if (!isOpen) return null;

  const handleProviderChange = (newProvider: ApiProvider) => {
    setProvider(newProvider);
    if (newProvider === 'gemini') {
      setConnectionType('official');
      setApiEndpoint('https://generativelanguage.googleapis.com');
      setModel('gemini-3.8-flash');
    } else if (newProvider === 'anthropic') {
      if (connectionType === 'official') {
        setApiEndpoint('https://api.anthropic.com/v1');
        setModel('claude-3-5-sonnet-20241022');
      } else {
        setApiEndpoint('https://aiapiflow.com');
        setModel('Claude-sonnet-5');
      }
    } else if (newProvider === 'openai') {
      if (connectionType === 'official') {
        setApiEndpoint('https://api.openai.com/v1');
        setModel('gpt-4o');
      } else {
        setModel('gpt-4o');
      }
    }
  };

  const handleConnectionTypeChange = (type: 'official' | 'gateway') => {
    setConnectionType(type);
    if (provider === 'anthropic') {
      if (type === 'official') {
        setApiEndpoint('https://api.anthropic.com/v1');
        setModel('claude-3-5-sonnet-20241022');
      } else {
        setApiEndpoint('https://aiapiflow.com');
        setModel('Claude-sonnet-5');
      }
    } else if (provider === 'openai') {
      if (type === 'official') {
        setApiEndpoint('https://api.openai.com/v1');
        setModel('gpt-4o');
      } else {
        setModel('gpt-4o');
      }
    }
  };

  const handleSave = () => {
    // 1. Update API settings
    updateSettings({
      provider,
      connectionType,
      apiKey: apiKey.trim(),
      apiEndpoint: apiEndpoint.trim(),
      model: model.trim(),
      temperature,
      isDemoMode,
    });

    // 2. Update Question character limits
    Object.entries(localLengths).forEach(([id, len]) => {
      if (len > 0) {
        updateQuestionMaxLength(id, len);
      }
    });

    alert('설정 및 문항별 답변 글자수가 성공적으로 저장되었습니다.');
    onClose();
  };

  const handleSetAllLengths = (len: number) => {
    const updated: Record<string, number> = {};
    questions.forEach((q) => {
      updated[q.id] = len;
    });
    setLocalLengths(updated);
  };

  const testApiConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({
        success: false,
        message: '테스트할 API 키를 입력해주세요.',
      });
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      const endpoint = apiEndpoint.replace(/\/+$/, '');
      const isAnthropic =
        provider === 'anthropic' ||
        model.toLowerCase().includes('claude') ||
        endpoint.includes('anthropic') ||
        endpoint.includes('aiapiflow');

      const isGemini =
        provider === 'gemini' ||
        model.toLowerCase().includes('gemini') ||
        endpoint.includes('googleapis.com');

      let res: Response;

      if (isAnthropic) {
        res = await fetch('/api/anthropic/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
            'x-base-url': endpoint,
          },
          body: JSON.stringify({
            model: model || 'claude-sonnet-5',
            max_tokens: 5,
            messages: [{ role: 'user', content: 'hi' }],
            stream: false,
          }),
        });
      } else if (isGemini) {
        const targetModel = model.trim() || 'gemini-3.8-flash';
        const geminiTestPayload = {
          model: targetModel,
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
          generationConfig: { maxOutputTokens: 5 },
        };
        try {
          res = await fetch('/api/gemini/generateContent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey.trim()}`,
              'x-base-url': endpoint,
            },
            body: JSON.stringify(geminiTestPayload),
          });
          if (res.status === 404) {
            throw new Error('Proxy 404');
          }
        } catch {
          const directUrl = `${endpoint.replace(/\/+$/, '')}/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;
          res = await fetch(directUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(geminiTestPayload),
          });
        }
      } else {
        res = await fetch('/api/openai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
            'x-base-url': endpoint,
          },
          body: JSON.stringify({
            model: model || 'gpt-4o',
            max_tokens: 5,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });
      }

      if (res.ok) {
        const targetModelName =
          model ||
          (isGemini
            ? 'gemini-3.8-flash'
            : isAnthropic
            ? connectionType === 'official'
              ? 'claude-3-5-sonnet'
              : 'Claude-sonnet-5'
            : 'gpt-4o');

        const providerLabel = isGemini
          ? 'Google Gemini'
          : isAnthropic
          ? connectionType === 'official'
            ? '공식 앤트로픽 API'
            : 'Anthropic Gateway (AIApiFlow)'
          : connectionType === 'official'
          ? '공식 Chat GPT (OpenAI)'
          : 'OpenAI Gateway';

        setTestResult({
          success: true,
          message: `연결 성공! ${providerLabel} (${targetModelName}) 정상 응답을 수신했습니다.`,
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        let errMsg =
          errorData?.error?.message ||
          errorData?.message ||
          `연결 실패 (${res.status}): 엔드포인트 URL 또는 API 키를 확인해주세요.`;
        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
          errMsg = 'Google Gemini API 키가 올바르지 않습니다. AI Studio에서 발급받은 키를 확인해주세요.';
        }
        setTestResult({
          success: false,
          message: errMsg,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `네트워크/CORS 오류: ${err.message || '엔드포인트에 접속할 수 없습니다.'}`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-zinc-200 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/60">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200/60 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-semibold text-zinc-900 tracking-tight truncate">환경 및 생성 설정</h2>
              <p className="text-[11px] sm:text-xs text-zinc-500 truncate">
                AI API Gateway 연동 및 문항별 생성 글자수를 설정합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 bg-zinc-50/60 px-3 sm:px-6 pt-2 gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 shrink-0 ${
              activeTab === 'api'
                ? 'border-zinc-900 text-zinc-900 bg-white shadow-2xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>AI Gateway 설정</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lengths')}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 shrink-0 ${
              activeTab === 'lengths'
                ? 'border-zinc-900 text-zinc-900 bg-white shadow-2xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>문항별 글자수 지정</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono border border-zinc-200/60">
              5문항
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'api' ? (
            /* TAB 1: API & Gateway Settings */
            <div className="space-y-5">
              {/* Demo Mode Toggle Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isDemoMode
                    ? 'bg-amber-50/70 border-amber-200 ring-1 ring-amber-400'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isDemoMode ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        스마트 시뮬레이션 (데모 모드)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        API 키 없이도 타이핑 스트리밍 및 모든 자소서 생성 기능을 완벽히 체험할 수 있습니다.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isDemoMode}
                      onChange={(e) => setIsDemoMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>

              {/* Provider Selection */}
              <div className={isDemoMode ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" />
                  API 제공자 (Provider)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleProviderChange('gemini')}
                    className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                      provider === 'gemini'
                        ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-bold ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold">Google Gemini</div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-semibold">
                        추천 ⭐
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      gemini-3.8-flash (구독 연동)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProviderChange('anthropic')}
                    className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                      provider === 'anthropic'
                        ? 'border-purple-600 bg-purple-50/50 text-purple-900 font-bold ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">Claude (앤트로픽)</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      공식 API / Gateway 지원
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProviderChange('openai')}
                    className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                      provider === 'openai'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">OpenAI (ChatGPT)</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      공식 API / Gateway 지원
                    </div>
                  </button>
                </div>
              </div>

              {/* Connection Type Dropdown for Claude and OpenAI */}
              {provider === 'anthropic' && !isDemoMode && (
                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-purple-600" />
                      Claude 연결 방식 (드롭다운)
                    </label>
                    <span className="text-[10px] text-purple-700 font-medium">
                      {connectionType === 'official' ? '공식 Anthropic API' : 'AIApiFlow Gateway'}
                    </span>
                  </div>
                  <select
                    value={connectionType}
                    onChange={(e) => handleConnectionTypeChange(e.target.value as 'official' | 'gateway')}
                    className="w-full px-3 py-2 text-xs font-semibold border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/40 bg-white text-slate-800 cursor-pointer"
                  >
                    <option value="official">공식 앤트로픽 API 키 (api.anthropic.com)</option>
                    <option value="gateway">Gateway 방식 (aiapiflow.com 또는 사설 프록시)</option>
                  </select>
                  <p className="text-[11px] text-purple-700/90 leading-tight">
                    {connectionType === 'official'
                      ? '💡 Anthropic Console(console.anthropic.com) 공식 계정에서 발급받은 sk-ant-... 키를 사용합니다.'
                      : '💡 AIApiFlow(aiapiflow.com) 또는 사설 리버스 프록시 게이트웨이를 통해 호출합니다.'}
                  </p>
                </div>
              )}

              {provider === 'openai' && !isDemoMode && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                      OpenAI 연결 방식 (드롭다운)
                    </label>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      {connectionType === 'official' ? '공식 ChatGPT API' : 'Gateway 방식'}
                    </span>
                  </div>
                  <select
                    value={connectionType}
                    onChange={(e) => handleConnectionTypeChange(e.target.value as 'official' | 'gateway')}
                    className="w-full px-3 py-2 text-xs font-semibold border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-white text-slate-800 cursor-pointer"
                  >
                    <option value="official">공식 Chat GPT 키 (OpenAI 공식 platform.openai.com)</option>
                    <option value="gateway">Gateway 방식 (OneAPI, NewAPI 등 사설 프록시)</option>
                  </select>
                  <p className="text-[11px] text-emerald-700/90 leading-tight">
                    {connectionType === 'official'
                      ? '💡 OpenAI Platform(platform.openai.com) 공식 계정에서 발급받은 sk-proj-... 키를 사용합니다.'
                      : '💡 OneAPI, NewAPI 등 사설 게이트웨이 또는 OpenAI 호환 프록시 엔드포인트를 사용합니다.'}
                  </p>
                </div>
              )}

              {/* API Key */}
              <div className={isDemoMode ? 'opacity-50 pointer-events-none' : ''}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-purple-600" />
                    {provider === 'gemini'
                      ? 'Google AI Studio API Key'
                      : provider === 'anthropic'
                      ? connectionType === 'official'
                        ? 'Anthropic 공식 API Key'
                        : 'Anthropic Gateway API Key'
                      : connectionType === 'official'
                      ? 'OpenAI 공식 API Key'
                      : 'OpenAI Gateway API Key'}
                  </label>
                  <span className="text-[11px] text-slate-400">브라우저 로컬스토리지에만 저장됨</span>
                </div>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      provider === 'gemini'
                        ? 'AIzaSy...'
                        : provider === 'anthropic'
                        ? connectionType === 'official'
                          ? 'sk-ant-api03-...'
                          : 'sk-...'
                        : connectionType === 'official'
                        ? 'sk-proj-...'
                        : 'sk-...'
                    }
                    className="w-full pr-10 pl-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {provider === 'gemini' && (
                  <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2 mt-1.5">
                    💡 <strong>제미나이 Pro 구독 계정 연동:</strong> 구독 중이신 구글 계정으로{' '}
                    <a
                      href="https://aistudio.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-bold text-blue-800 hover:text-blue-900"
                    >
                      Google AI Studio (aistudio.google.com)
                    </a>
                    에 로그인하신 뒤 [Get API key]를 누르시면 카드 등록 없이 10초 만에 키가 발급됩니다.
                  </p>
                )}
              </div>

              {/* Endpoint (Gateway URL) */}
              <div className={isDemoMode ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-purple-600" />
                  {provider === 'gemini'
                    ? 'Google API 엔드포인트'
                    : connectionType === 'official'
                    ? '공식 API Base URL'
                    : 'Gateway Base URL (엔드포인트)'}
                </label>
                <input
                  type="text"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder={
                    provider === 'gemini'
                      ? 'https://generativelanguage.googleapis.com'
                      : provider === 'anthropic'
                      ? connectionType === 'official'
                        ? 'https://api.anthropic.com/v1'
                        : 'https://aiapiflow.com'
                      : 'https://api.openai.com/v1'
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  기본 엔드포인트:{' '}
                  <code className="text-purple-600 font-mono">
                    {provider === 'gemini'
                      ? 'https://generativelanguage.googleapis.com'
                      : provider === 'anthropic'
                      ? connectionType === 'official'
                        ? 'https://api.anthropic.com/v1'
                        : 'https://aiapiflow.com'
                      : 'https://api.openai.com/v1'}
                  </code>
                </p>
              </div>

              {/* Model Selection & Temperature */}
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
                  isDemoMode ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    사용 모델 (Model)
                  </label>
                  {provider === 'gemini' ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="gemini-3.8-flash"
                        className="w-full px-3 py-2 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 bg-white"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400">빠른 선택:</span>
                        <button
                          type="button"
                          onClick={() => setModel('gemini-3.8-flash')}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition-colors ${
                            model === 'gemini-3.8-flash'
                              ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                          }`}
                        >
                          gemini-3.8-flash (구독 추천 ⭐)
                        </button>
                        <button
                          type="button"
                          onClick={() => setModel('gemini-2.0-flash')}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition-colors ${
                            model === 'gemini-2.0-flash'
                              ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                          }`}
                        >
                          gemini-2.0-flash
                        </button>
                        <button
                          type="button"
                          onClick={() => setModel('gemini-1.5-pro')}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition-colors ${
                            model === 'gemini-1.5-pro'
                              ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                          }`}
                        >
                          gemini-1.5-pro
                        </button>
                      </div>
                    </div>
                  ) : provider === 'anthropic' ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder={
                          connectionType === 'official' ? 'claude-3-5-sonnet-20241022' : 'Claude-sonnet-5'
                        }
                        className="w-full px-3 py-2 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 bg-white"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400">빠른 선택:</span>
                        {connectionType === 'official' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setModel('claude-3-5-sonnet-20241022')}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition-colors ${
                                model === 'claude-3-5-sonnet-20241022'
                                  ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                              }`}
                            >
                              claude-3-5-sonnet (공식 추천 ⭐)
                            </button>
                            <button
                              type="button"
                              onClick={() => setModel('claude-3-7-sonnet-20250219')}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition-colors ${
                                model === 'claude-3-7-sonnet-20250219'
                                  ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                              }`}
                            >
                              claude-3-7-sonnet
                            </button>
                            <button
                              type="button"
                              onClick={() => setModel('claude-3-haiku-20240307')}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition-colors ${
                                model === 'claude-3-haiku-20240307'
                                  ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                              }`}
                            >
                              claude-3-haiku
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setModel('Claude-sonnet-5')}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition-colors ${
                                model === 'Claude-sonnet-5' || model === 'claude-sonnet-5'
                                  ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                              }`}
                            >
                              Claude-sonnet-5 (AIApiFlow 추천 ⭐)
                            </button>
                            <button
                              type="button"
                              onClick={() => setModel('claude-3-5-sonnet-20241022')}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition-colors ${
                                model === 'claude-3-5-sonnet-20241022'
                                  ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                              }`}
                            >
                              claude-3-5-sonnet
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="gpt-4o"
                        className="w-full px-3 py-2 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400">빠른 선택:</span>
                        <button
                          type="button"
                          onClick={() => setModel('gpt-4o')}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition-colors ${
                            model === 'gpt-4o'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                          }`}
                        >
                          gpt-4o (추천 ⭐)
                        </button>
                        <button
                          type="button"
                          onClick={() => setModel('gpt-4o-mini')}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition-colors ${
                            model === 'gpt-4o-mini'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                          }`}
                        >
                          gpt-4o-mini
                        </button>
                        {connectionType === 'official' && (
                          <button
                            type="button"
                            onClick={() => setModel('o3-mini')}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition-colors ${
                              model === 'o3-mini'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                            }`}
                          >
                            o3-mini
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-purple-600" />
                      온도 (Temperature)
                    </label>
                    <span className="text-xs font-mono font-bold text-purple-600">
                      {temperature}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-purple-600 mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>정밀하고 논리적 (0.0)</span>
                    <span>창의적이고 풍부함 (1.0)</span>
                  </div>
                </div>
              </div>

              {/* Connection Test */}
              {!isDemoMode && (
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={testingConnection || !apiKey.trim()}
                    onClick={testApiConnection}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Gateway 연결 확인 중...
                      </>
                    ) : (
                      'Gateway 연결 테스트'
                    )}
                  </button>

                  {testResult && (
                    <div
                      className={`mt-2 p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                        testResult.success
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-relaxed">{testResult.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: Per-Question Target Character Counts */
            <div className="space-y-4">
              {/* Guidance Box */}
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-purple-950">
                  <AlignLeft className="w-4 h-4 text-purple-700" />
                  문항별 목표 글자수 안내
                </div>
                <p className="text-[11px] text-purple-800">
                  AI가 회사별 맞춤 자기소개서를 생성할 때, 각 문항의 답변 분량을 아래 지정된 목표 글자수(공백 포함)에 맞춰 작성하도록 프롬프트에 엄격히 반영됩니다.
                </p>
              </div>

              {/* Batch Preset Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold text-slate-700 shrink-0">전체 문항 일괄 설정:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[500, 800, 1000, 1500].map((presetLen) => (
                    <button
                      key={presetLen}
                      type="button"
                      onClick={() => handleSetAllLengths(presetLen)}
                      className="px-2 sm:px-2.5 py-1 text-xs font-semibold bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-300 hover:border-purple-300 rounded-lg transition-colors shadow-2xs"
                    >
                      {presetLen.toLocaleString()}자
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Length Items */}
              <div className="space-y-3">
                {questions.map((q, idx) => {
                  const currentLen = localLengths[q.id] ?? q.maxLength ?? 1000;
                  const draftLen = countCharacters(q.answer);

                  return (
                    <div
                      key={q.id}
                      className="p-3 sm:p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {q.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 pl-7 truncate">
                          현재 작성된 기본 답변: {draftLen.toLocaleString()}자
                        </p>
                      </div>

                      {/* Input Control */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-7 sm:pl-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <span className="text-xs text-slate-500 sm:hidden">목표 글자수:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={100}
                            max={5000}
                            step={50}
                            value={currentLen}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setLocalLengths((prev) => ({
                                ...prev,
                                [q.id]: isNaN(val) ? 0 : val,
                              }));
                            }}
                            className="w-20 px-2 py-1 text-xs font-mono font-bold text-right border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
                          />
                          <span className="text-xs text-slate-500 font-medium">자</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('기본 설정으로 되돌리시겠습니까?')) {
                resetSettings();
                handleSetAllLengths(1000);
                onClose();
              }
            }}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            기본값 리셋
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-medium text-zinc-600 hover:text-zinc-800 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-2xs transition-colors"
            >
              설정 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
