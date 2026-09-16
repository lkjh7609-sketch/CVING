import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings, ApiProvider } from '@/lib/types';

interface SettingsState {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const envApiKey = (
  (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
  (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined) ||
  (import.meta.env.VITE_API_KEY as string | undefined) ||
  (import.meta.env.VITE_OPENAI_API_KEY as string | undefined) ||
  ''
).trim();

const envEndpoint = (
  (import.meta.env.VITE_GEMINI_BASE_URL as string | undefined) ||
  (import.meta.env.VITE_ANTHROPIC_BASE_URL as string | undefined) ||
  (import.meta.env.VITE_API_ENDPOINT as string | undefined) ||
  (import.meta.env.VITE_OPENAI_BASE_URL as string | undefined) ||
  'https://generativelanguage.googleapis.com'
).trim();

const envModel = (
  (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ||
  (import.meta.env.VITE_ANTHROPIC_MODEL as string | undefined) ||
  (import.meta.env.VITE_API_MODEL as string | undefined) ||
  (import.meta.env.VITE_MODEL as string | undefined) ||
  'gemini-3.8-flash'
).trim();

const envProvider: ApiProvider =
  ((import.meta.env.VITE_API_PROVIDER as string | undefined) as ApiProvider) ||
  'gemini';

const DEFAULT_SETTINGS: AppSettings = {
  provider: envProvider,
  connectionType: 'official',
  apiKey: envApiKey,
  apiEndpoint: envEndpoint,
  model: envModel,
  temperature: 0.7,
  isDemoMode: !envApiKey,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),

      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'cving_settings_storage',
      merge: (persistedState: any, currentState: SettingsState) => {
        const persistedSettings = persistedState?.settings || {};
        const effectiveApiKey = persistedSettings.apiKey || envApiKey;
        const effectiveProvider = persistedSettings.provider || envProvider;
        const effectiveEndpoint = persistedSettings.apiEndpoint || envEndpoint;
        const effectiveConnectionType =
          persistedSettings.connectionType ||
          (effectiveEndpoint.includes('aiapiflow') ? 'gateway' : 'official');
        
        // If persisted model was old default or empty, prioritize Claude-sonnet-5
        let effectiveModel = persistedSettings.model;
        if (!effectiveModel || effectiveModel === 'gpt-4o' || effectiveModel === 'claude-3-5-sonnet-20241022') {
          effectiveModel = envModel || 'Claude-sonnet-5';
        }

        const effectiveIsDemo =
          persistedSettings.isDemoMode !== undefined
            ? (effectiveApiKey ? persistedSettings.isDemoMode : true)
            : !effectiveApiKey;

        return {
          ...currentState,
          settings: {
            ...DEFAULT_SETTINGS,
            ...persistedSettings,
            provider: effectiveProvider,
            connectionType: effectiveConnectionType,
            apiKey: effectiveApiKey,
            apiEndpoint: effectiveEndpoint,
            model: effectiveModel,
            isDemoMode: effectiveIsDemo,
          },
        };
      },
    }
  )
);
