import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Company } from '@/lib/types';
import { storageService } from '@/services/storageService';

export const MAX_COMPANIES = 5;

export const SAMPLE_COMPANIES: Company[] = [
  {
    id: 'comp-1',
    name: '네이버페이',
    targetRole: '웹 프론트엔드 개발자',
    jobPostingText: `[담당 업무]
- 네이버페이 결제/정산 시스템 및 금융 홈 웹 프론트엔드 서비스 개발
- 대규모 트래픽 환경에서의 웹 퍼포먼스 최적화 및 안정적인 컴포넌트 설계
- 공통 디자인 시스템 및 UI 라이브러리 고도화

[지원 자격]
- React, TypeScript, 모던 웹 표준 기술 스택에 대한 깊은 이해가 있으신 분
- 웹 성능 최적화, 렌더링 파이프라인 및 브라우저 동작 원리에 대한 깊은 이해를 갖추신 분
- 복잡한 비즈니스 로직을 모듈화하고 유지보수 가능한 코드로 추상화할 수 있는 역량

[우대 사항]
- 대규모 트래픽 서비스 개발 및 운영 경험
- TDD 기반의 테스트 코드 작성 및 CI/CD 파이프라인 구축 경험
- 금융/결제 도메인에 대한 관심 및 높은 책임감`,
    ocrStatus: 'idle',
  },
  {
    id: 'comp-2',
    name: '토스 (비바리퍼블리카)',
    targetRole: 'Frontend Platform Engineer',
    jobPostingText: `[합류하게 될 팀에 대해 알려드려요]
- 토스 전사 프론트엔드 개발자가 사용하는 공통 인프라, 번들링 파이프라인, 디자인 시스템을 개발합니다.
- 수천만 사용자의 매끄러운 사용 경험과 개발 생산성을 동시에 극대화합니다.

[주요 업무]
- 모던 프론트엔드 프레임워크(Next.js, Vite) 기반의 웹 플랫폼 구축
- 디자인 시스템 라이브러리 설계 및 컴포넌트 접근성(A11y) 가이드 수립
- 빌드/번들 성능 개선 및 웹 바이탈(Core Web Vitals) 모니터링

[자격 요건]
- 3년 이상의 웹 프론트엔드 실무 경험 혹은 그에 준하는 탄탄한 엔지니어링 역량
- 기술적 문제를 근본적으로 분석하고 동료 개발자를 위해 지식을 공유하는 것을 즐기시는 분`,
    ocrStatus: 'idle',
  },
];

interface CompanyState {
  companies: Company[];
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string | null) => void;
  addCompany: () => boolean; // returns false if max reached
  removeCompany: (id: string) => void;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  setCompanyScreenshot: (id: string, dataUrl: string) => Promise<void>;
  removeCompanyScreenshot: (id: string) => Promise<void>;
  loadSampleCompanies: () => void;
  resetCompanies: () => void;
  initializeImagesFromStorage: () => Promise<void>;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set, get) => ({
      companies: [
        {
          id: 'comp-1',
          name: '네이버페이',
          targetRole: '웹 프론트엔드 개발자',
          jobPostingText: SAMPLE_COMPANIES[0].jobPostingText,
          ocrStatus: 'idle',
        },
      ],
      activeCompanyId: 'comp-1',

      setActiveCompanyId: (id) => set({ activeCompanyId: id }),

      addCompany: () => {
        const { companies } = get();
        if (companies.length >= MAX_COMPANIES) {
          return false;
        }
        const newId = `comp-${Date.now()}`;
        const newCompany: Company = {
          id: newId,
          name: `목표 기업 ${companies.length + 1}`,
          targetRole: '',
          jobPostingText: '',
          ocrStatus: 'idle',
        };
        set({
          companies: [...companies, newCompany],
          activeCompanyId: newId,
        });
        return true;
      },

      removeCompany: async (id) => {
        const { companies, activeCompanyId } = get();
        const target = companies.find((c) => c.id === id);
        if (target?.screenshotImageId) {
          try {
            await storageService.deleteImage(target.screenshotImageId);
          } catch (e) {
            console.error('Failed to remove image from storage', e);
          }
        }

        const filtered = companies.filter((c) => c.id !== id);
        const nextActive = activeCompanyId === id
          ? (filtered.length > 0 ? filtered[0].id : null)
          : activeCompanyId;

        set({
          companies: filtered,
          activeCompanyId: nextActive,
        });
      },

      updateCompany: (id, updates) =>
        set((state) => ({
          companies: state.companies.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      setCompanyScreenshot: async (id, dataUrl) => {
        const imageId = `img_${id}_${Date.now()}`;
        try {
          await storageService.saveImage(imageId, dataUrl);
        } catch (e) {
          console.error('IndexedDB save image error:', e);
        }

        set((state) => ({
          companies: state.companies.map((c) =>
            c.id === id
              ? {
                  ...c,
                  screenshotImageId: imageId,
                  screenshotDataUrl: dataUrl,
                  ocrStatus: 'idle',
                  ocrProgress: 0,
                  ocrError: undefined,
                }
              : c
          ),
        }));
      },

      removeCompanyScreenshot: async (id) => {
        const company = get().companies.find((c) => c.id === id);
        if (company?.screenshotImageId) {
          try {
            await storageService.deleteImage(company.screenshotImageId);
          } catch (e) {
            console.error('IndexedDB delete image error:', e);
          }
        }

        set((state) => ({
          companies: state.companies.map((c) =>
            c.id === id
              ? {
                  ...c,
                  screenshotImageId: undefined,
                  screenshotDataUrl: undefined,
                  ocrStatus: 'idle',
                  ocrProgress: 0,
                  ocrText: undefined,
                  ocrError: undefined,
                }
              : c
          ),
        }));
      },

      loadSampleCompanies: () => {
        set({
          companies: SAMPLE_COMPANIES,
          activeCompanyId: SAMPLE_COMPANIES[0].id,
        });
      },

      resetCompanies: () => {
        set({
          companies: [
            {
              id: `comp-${Date.now()}`,
              name: '목표 기업 1',
              targetRole: '',
              jobPostingText: '',
              ocrStatus: 'idle',
            },
          ],
          activeCompanyId: null,
        });
      },

      initializeImagesFromStorage: async () => {
        const { companies } = get();
        let changed = false;
        const updated = await Promise.all(
          companies.map(async (c) => {
            if (c.screenshotImageId && !c.screenshotDataUrl) {
              try {
                const data = await storageService.getImage(c.screenshotImageId);
                if (data) {
                  changed = true;
                  return { ...c, screenshotDataUrl: data };
                }
              } catch (e) {
                console.error('Failed to load image from storage', e);
              }
            }
            return c;
          })
        );
        if (changed) {
          set({ companies: updated });
        }
      },
    }),
    {
      name: 'cving_companies_storage',
      // Avoid storing massive base64 in localStorage since it's saved in IndexedDB
      partialize: (state) => ({
        companies: state.companies.map((c) => ({
          ...c,
          screenshotDataUrl: undefined, // stripped for localStorage quota safety
        })),
        activeCompanyId: state.activeCompanyId,
      }),
    }
  )
);
