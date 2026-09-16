export interface Question {
  id: string;
  title: string;
  description: string;
  answer: string;
  maxLength: number;
}

export interface Company {
  id: string;
  name: string;
  targetRole?: string;
  jobPostingText: string;
  screenshotImageId?: string; // Key in IndexedDB
  screenshotDataUrl?: string; // Preview data URL
  ocrText?: string;
  ocrStatus: 'idle' | 'processing' | 'success' | 'failed';
  ocrProgress?: number; // 0 - 100
  ocrError?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  isDefault: boolean;
}

export interface GenerationResult {
  companyId: string;
  status: 'idle' | 'generating' | 'success' | 'error';
  content: string;
  streamedContent?: string;
  error?: string;
  updatedAt?: number;
}

export type ApiProvider = 'anthropic' | 'gemini' | 'openai' | 'custom';
export type ConnectionType = 'official' | 'gateway';

export interface AppSettings {
  provider: ApiProvider;
  connectionType?: ConnectionType;
  apiKey: string;
  apiEndpoint: string;
  model: string;
  temperature: number;
  isDemoMode: boolean;
}

