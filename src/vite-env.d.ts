/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANTHROPIC_API_KEY?: string;
  readonly VITE_ANTHROPIC_BASE_URL?: string;
  readonly VITE_ANTHROPIC_MODEL?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_OPENAI_BASE_URL?: string;
  readonly VITE_OPENAI_MODEL?: string;
  readonly VITE_API_KEY?: string;
  readonly VITE_API_ENDPOINT?: string;
  readonly VITE_API_MODEL?: string;
  readonly VITE_MODEL?: string;
  readonly VITE_API_PROVIDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
