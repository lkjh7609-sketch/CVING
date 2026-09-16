import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Question } from '@/lib/types';

export const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 'q1',
    title: '1. 지원동기 및 입사 후 포부',
    description: '해당 직무와 기업에 관심을 가지게 된 계기 및 입사 후 성장 목표',
    answer: '',
    maxLength: 1000,
  },
  {
    id: 'q2',
    title: '2. 직무 역량 및 핵심 경험',
    description: '직무를 수행하기 위해 쌓아온 전문 지식, 기술, 프로젝트 실무 경험',
    answer: '',
    maxLength: 1000,
  },
  {
    id: 'q3',
    title: '3. 도전 및 문제 해결 경험',
    description: '어려운 목표나 돌발 문제에 직면했을 때 적극적으로 대안을 찾아 극복한 사례',
    answer: '',
    maxLength: 1000,
  },
  {
    id: 'q4',
    title: '4. 협업 및 소통 역량',
    description: '팀 프로젝트나 조직 내에서 다양한 의견을 조율하고 시너지를 낸 경험',
    answer: '',
    maxLength: 1000,
  },
  {
    id: 'q5',
    title: '5. 직업관 및 가치관',
    description: '일과 삶에서 가장 중요하게 생각하는 원칙과 직업적 신념',
    answer: '',
    maxLength: 1000,
  },
];

export const SAMPLE_ANSWERS: Record<string, string> = {
  q1: `기술을 통해 사람들의 일상을 실질적으로 편리하게 개선하는 프로덕트를 만들고 싶다는 열망으로 소프트웨어 개발의 길을 걸어왔습니다. 특히 사용자 중심의 직관적인 인터페이스와 안정적인 데이터 파이프라인을 구축하는 과정에서 가장 큰 성취감을 느낍니다. 입사 후에는 기여도를 극대화하기 위해 도메인 비즈니스 로직과 시스템 아키텍처를 빠르게 습득하고, 단기적으로는 핵심 기능 개발을 안정적으로 완수하며, 장기적으로는 제품의 기술적 로드맵을 주도하는 리드 엔지니어로 도약하고자 합니다.`,
  q2: `React, TypeScript, Next.js 기반의 프론트엔드 아키텍처 설계와 성능 최적화에 전문성을 갖추고 있습니다. 이전 프로젝트에서는 Lighthouse 웹 성능 점수를 65점에서 94점으로 개선하였고, Zustand 및 React Query를 활용하여 상태 관리 구조를 모듈화함으로써 불필요한 리렌더링을 40% 이상 감축시켰습니다. 또한 디자인 시스템을 구축하여 팀 내 UI 컴포넌트 재사용성을 극대화한 경험이 있습니다.`,
  q3: `서비스 론칭 직전 대규모 트래픽 시뮬레이션 중 데이터 응답 지연 및 메모리 누수 병목 현상이 발생했습니다. 원인 규명을 위해 브라우저 프로파일링 툴과 네트워크 모니터링 로그를 정밀 분석하여, 비동기 호출 중복과 불필요한 거대 번들 로딩이 원인임을 밝혀냈습니다. 코드 스플리팅, API 응답 캐싱, 가상 스크롤을 신속히 적용하여 응답 시간을 1.8초에서 0.3초로 단축시키며 오픈 일정을 무결점으로 지켜냈습니다.`,
  q4: `서로 다른 우선순위를 가진 기획자, 디자이너, 백엔드 개발자 간의 일정 조율 갈등을 해결한 경험이 있습니다. 기능 구현 가능성과 디자인 디테일 사이에서 이견이 좁혀지지 않을 때, 각 파트의 핵심 목표를 청취한 뒤 사용자 관점에서의 MVP 기능과 단계별 배포 로드맵을 문서화하여 제안했습니다. 정량적 데이터를 바탕으로 한 커뮤니케이션을 통해 팀원 전원의 공감을 이끌어내어 예정된 스프린트 목표를 100% 달성했습니다.`,
  q5: `'끝없는 학습과 집요한 완성도, 그리고 동료에 대한 신뢰'를 일의 가장 큰 원칙으로 삼고 있습니다. 빠르게 진화하는 기술 트렌드에 안주하지 않고 매주 최신 기술 아티클과 오픈소스 코드를 분석하며 성장합니다. 내가 작성한 코드가 동료에게는 신뢰할 수 있는 기반이 되고, 사용자에게는 최상의 경험이 되어야 한다는 책임감으로 작은 에지 케이스까지 놓치지 않고 꼼꼼히 점검합니다.`,
};

interface QuestionState {
  questions: Question[];
  includeSpaces: boolean;
  activeQuestionId: string;
  setActiveQuestionId: (id: string) => void;
  setIncludeSpaces: (include: boolean) => void;
  updateQuestionAnswer: (id: string, answer: string) => void;
  updateQuestionTitle: (id: string, title: string) => void;
  updateQuestionMaxLength: (id: string, maxLength: number) => void;
  updateAllQuestionsMaxLength: (maxLength: number) => void;
  loadSampleAnswers: () => void;
  resetAnswers: () => void;
}

export const useQuestionStore = create<QuestionState>()(
  persist(
    (set) => ({
      questions: DEFAULT_QUESTIONS,
      includeSpaces: true,
      activeQuestionId: 'q1',

      setActiveQuestionId: (id) => set({ activeQuestionId: id }),

      setIncludeSpaces: (includeSpaces) => set({ includeSpaces }),

      updateQuestionAnswer: (id, answer) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === id ? { ...q, answer } : q
          ),
        })),

      updateQuestionTitle: (id, title) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === id ? { ...q, title } : q
          ),
        })),

      updateQuestionMaxLength: (id, maxLength) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === id ? { ...q, maxLength } : q
          ),
        })),

      updateAllQuestionsMaxLength: (maxLength) =>
        set((state) => ({
          questions: state.questions.map((q) => ({
            ...q,
            maxLength,
          })),
        })),

      loadSampleAnswers: () =>
        set((state) => ({
          questions: state.questions.map((q) => ({
            ...q,
            answer: SAMPLE_ANSWERS[q.id] || q.answer,
          })),
        })),

      resetAnswers: () =>
        set((state) => ({
          questions: state.questions.map((q) => ({ ...q, answer: '' })),
        })),
    }),
    {
      name: 'cving_questions_storage',
    }
  )
);
