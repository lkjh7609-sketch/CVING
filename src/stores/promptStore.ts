import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PromptTemplate } from '@/lib/types';

export const DEFAULT_PROMPT_TEMPLATE: PromptTemplate = {
  id: 'default',
  name: '표준 컨설턴트 모드 (추천)',
  description: '회사의 공고 분석 후 5개 기본 답변의 경험을 바탕으로 회사 맞춤형 자소서를 완성합니다.',
  systemPrompt: `당신은 국내 대기업 및 유니콘 스타트업 채용 프로세스를 깊이 이해하고 있는 대한민국 최고의 전문 자기소개서 작성 컨설턴트입니다.

[핵심 역할 및 지침]
1. 목표 회사의 공고 내용(직무 요구사항, 주요 업무, 우대사항, 인재상)을 정밀하게 분석합니다.
2. 지원자가 작성한 5개 기본 문항의 진솔한 경험, 정량적 성과, 역량 키워드를 핵심 원천 자료로 활용합니다.
3. 목표 회사의 문항 구조에 맞추거나, 공고 내용에 최적화된 문항(지원동기, 직무역량, 문제해결, 협업, 입사후포부 등)으로 재구성하여 매끄럽고 설득력 있는 글을 작성합니다.
4. 단순 나열이 아닌 STAR 기법(Situation, Task, Action, Result)과 두괄식 구성을 적용합니다.
5. 어투는 정중하고 전문적인 비즈니스 문체('~했습니다', '~하고자 합니다')를 유지합니다.
6. 각 문항별로 글자수 제한(기본 800~1000자 수준)에 적절하도록 밀도 있는 분량으로 작성합니다.

[출력 형식]
반드시 다음 형식으로 작성해 주십시오:

### [문항 1] 문항 제목
답변 본문...

---

### [문항 2] 문항 제목
답변 본문...

(각 문항을 '---' 구분선으로 구분)`,
  userPromptTemplate: `아래 제공된 [목표 기업 및 공고 정보]와 [지원자의 기본 답변 5개]를 정밀하게 분석하여, 해당 기업에 완벽히 최적화된 완성형 자기소개서를 작성해 주십시오.

{{COMPANY_INFO}}

{{BASE_ANSWERS}}

위 기업의 요구사항에 맞추어 매력적이고 설득력 있는 자기소개서를 완성해 주십시오.`,
  isDefault: true,
};

export const ALTERNATIVE_TEMPLATES: PromptTemplate[] = [
  {
    id: 'storytelling',
    name: '스토리텔링 & 임팩트 강조형',
    description: '구체적인 에피소드와 드라마틱한 문제해결 과정을 극대화하여 몰입감을 높입니다.',
    systemPrompt: `당신은 지원자의 경험 속에서 가장 빛나는 순간을 포착하여 몰입도 높은 서사로 전환하는 스토리텔링 전문 자소서 컨설턴트입니다.
- 결과 중심의 두괄식 소제목과 몰입도 높은 상황 묘사를 결합합니다.
- 실패를 극복하며 얻은 깊은 성찰과 직무 성숙도를 부각합니다.`,
    userPromptTemplate: DEFAULT_PROMPT_TEMPLATE.userPromptTemplate,
    isDefault: false,
  },
  {
    id: 'data-driven',
    name: '정량적 성과 & 실무 중심형',
    description: '수치화된 성과와 기술 스택, 실무 적응력을 전면에 내세우는 경력/수시채용 특화 모드입니다.',
    systemPrompt: `당신은 테크 기업 및 전문직 채용관의 시선에서 실무 투입 즉시 성과를 낼 수 있는 지원자임을 증명하는 테크니컬 리크루팅 전문가입니다.
- 구체적인 기술 스택, 개선 수치(%), 프로세스 최적화 지표를 명확히 제시합니다.
- 직무 적합성과 기술적 깊이를 논리정연하게 증명합니다.`,
    userPromptTemplate: DEFAULT_PROMPT_TEMPLATE.userPromptTemplate,
    isDefault: false,
  },
];

interface PromptState {
  templates: PromptTemplate[];
  selectedTemplateId: string;
  selectTemplate: (id: string) => void;
  updateTemplate: (id: string, updates: Partial<PromptTemplate>) => void;
  addTemplate: (template: Omit<PromptTemplate, 'id' | 'isDefault'>) => void;
  deleteTemplate: (id: string) => void;
  resetToDefault: () => void;
  getSelectedTemplate: () => PromptTemplate;
}

export const usePromptStore = create<PromptState>()(
  persist(
    (set, get) => ({
      templates: [DEFAULT_PROMPT_TEMPLATE, ...ALTERNATIVE_TEMPLATES],
      selectedTemplateId: 'default',

      selectTemplate: (id) => set({ selectedTemplateId: id }),

      updateTemplate: (id, updates) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      addTemplate: (newTpl) => {
        const id = `tpl-${Date.now()}`;
        const template: PromptTemplate = {
          ...newTpl,
          id,
          isDefault: false,
        };
        set((state) => ({
          templates: [...state.templates, template],
          selectedTemplateId: id,
        }));
      },

      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          selectedTemplateId:
            state.selectedTemplateId === id ? 'default' : state.selectedTemplateId,
        })),

      resetToDefault: () =>
        set({
          templates: [DEFAULT_PROMPT_TEMPLATE, ...ALTERNATIVE_TEMPLATES],
          selectedTemplateId: 'default',
        }),

      getSelectedTemplate: () => {
        const { templates, selectedTemplateId } = get();
        return (
          templates.find((t) => t.id === selectedTemplateId) ||
          templates[0] ||
          DEFAULT_PROMPT_TEMPLATE
        );
      },
    }),
    {
      name: 'cving_prompts_storage',
    }
  )
);
