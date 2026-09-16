import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GenerationResult } from '@/lib/types';
import { useCompanyStore } from './companyStore';
import { useQuestionStore } from './questionStore';
import { usePromptStore } from './promptStore';
import { useSettingsStore } from './settingsStore';
import { aiService } from '@/services/aiService';

interface ResultState {
  results: Record<string, GenerationResult>;
  activeTabCompanyId: string | null;
  isBatchGenerating: boolean;
  abortController: AbortController | null;

  setActiveTabCompanyId: (companyId: string | null) => void;
  setResult: (companyId: string, result: Partial<GenerationResult>) => void;
  clearResult: (companyId: string) => void;
  clearAllResults: () => void;

  generateForCompany: (companyId: string) => Promise<void>;
  generateAllCompanies: () => Promise<void>;
  cancelGeneration: () => void;
}

export const useResultStore = create<ResultState>()(
  persist(
    (set, get) => ({
      results: {},
      activeTabCompanyId: null,
      isBatchGenerating: false,
      abortController: null,

      setActiveTabCompanyId: (companyId) => set({ activeTabCompanyId: companyId }),

      setResult: (companyId, partial) =>
        set((state) => {
          const current = state.results[companyId] || {
            companyId,
            status: 'idle',
            content: '',
          };
          return {
            results: {
              ...state.results,
              [companyId]: {
                ...current,
                ...partial,
                updatedAt: Date.now(),
              },
            },
          };
        }),

      clearResult: (companyId) =>
        set((state) => {
          const next = { ...state.results };
          delete next[companyId];
          return { results: next };
        }),

      clearAllResults: () => set({ results: {} }),

      cancelGeneration: () => {
        const { abortController, results } = get();
        if (abortController) {
          abortController.abort();
        }

        // Immediately finalize any currently generating company's result so it doesn't stay spinning
        const nextResults = { ...results };
        let hasChanges = false;
        Object.keys(nextResults).forEach((id) => {
          if (nextResults[id].status === 'generating') {
            const preservedText = nextResults[id].streamedContent || nextResults[id].content || '';
            nextResults[id] = {
              ...nextResults[id],
              status: preservedText.trim() ? 'success' : 'idle',
              content: preservedText,
              streamedContent: undefined,
            };
            hasChanges = true;
          }
        });

        set({
          abortController: null,
          isBatchGenerating: false,
          ...(hasChanges ? { results: nextResults } : {}),
        });
      },


      generateForCompany: async (companyId: string) => {
        const company = useCompanyStore.getState().companies.find((c) => c.id === companyId);
        if (!company) return;

        const questions = useQuestionStore.getState().questions;
        const promptTemplate = usePromptStore.getState().getSelectedTemplate();
        const settings = useSettingsStore.getState().settings;

        const controller = new AbortController();
        set({
          abortController: controller,
          activeTabCompanyId: companyId,
        });

        get().setResult(companyId, {
          status: 'generating',
          content: '',
          streamedContent: '',
          error: undefined,
        });

        try {
          await aiService.generateResumeStream(
            company,
            questions,
            promptTemplate,
            settings,
            {
              onChunk: (chunk) => {
                get().setResult(companyId, {
                  status: 'generating',
                  streamedContent: chunk,
                  content: chunk,
                });
              },
              onError: (error) => {
                get().setResult(companyId, {
                  status: 'error',
                  error,
                });
              },
              onFinish: (fullContent) => {
                get().setResult(companyId, {
                  status: 'success',
                  content: fullContent,
                  streamedContent: undefined,
                });
              },
            },
            controller.signal
          );
        } finally {
          set({ abortController: null });
        }
      },

      generateAllCompanies: async () => {
        const companies = useCompanyStore.getState().companies;
        if (companies.length === 0) return;

        const controller = new AbortController();
        set({
          isBatchGenerating: true,
          abortController: controller,
          activeTabCompanyId: companies[0].id,
        });

        const questions = useQuestionStore.getState().questions;
        const promptTemplate = usePromptStore.getState().getSelectedTemplate();
        const settings = useSettingsStore.getState().settings;

        // Process in batches of 2 as planned in specification
        const batchSize = 2;
        try {
          for (let i = 0; i < companies.length; i += batchSize) {
            if (controller.signal.aborted) break;

            const batch = companies.slice(i, i + batchSize);
            await Promise.all(
              batch.map(async (comp) => {
                get().setResult(comp.id, {
                  status: 'generating',
                  content: '',
                  streamedContent: '',
                  error: undefined,
                });

                await aiService.generateResumeStream(
                  comp,
                  questions,
                  promptTemplate,
                  settings,
                  {
                    onChunk: (chunk) => {
                      get().setResult(comp.id, {
                        status: 'generating',
                        streamedContent: chunk,
                        content: chunk,
                      });
                    },
                    onError: (error) => {
                      get().setResult(comp.id, {
                        status: 'error',
                        error,
                      });
                    },
                    onFinish: (fullContent) => {
                      get().setResult(comp.id, {
                        status: 'success',
                        content: fullContent,
                        streamedContent: undefined,
                      });
                    },
                  },
                  controller.signal
                );
              })
            );
          }
        } finally {
          set({ isBatchGenerating: false, abortController: null });
        }
      },
    }),
    {
      name: 'cving_results_storage',
      partialize: (state) => ({
        results: state.results,
        activeTabCompanyId: state.activeTabCompanyId,
      }),
    }
  )
);
