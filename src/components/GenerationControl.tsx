import React from 'react';
import { useCompanyStore } from '@/stores/companyStore';
import { useQuestionStore } from '@/stores/questionStore';
import { usePromptStore } from '@/stores/promptStore';
import { useResultStore } from '@/stores/resultStore';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Loader2,
  StopCircle,
  Sliders,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { countCharacters } from '@/lib/utils';

interface GenerationControlProps {
  onOpenPrompts: () => void;
}

export const GenerationControl: React.FC<GenerationControlProps> = ({ onOpenPrompts }) => {
  const { companies } = useCompanyStore();
  const { questions, includeSpaces } = useQuestionStore();
  const { getSelectedTemplate } = usePromptStore();
  const { isBatchGenerating, generateAllCompanies, cancelGeneration, results } = useResultStore();

  const selectedTemplate = getSelectedTemplate();

  // Basic check: at least one company has content, and at least one question has content
  const hasQuestions = questions.some(
    (q) => countCharacters(q.answer, includeSpaces) >= 50
  );
  const validCompanies = companies.filter(
    (c) => c.name.trim() && (c.jobPostingText?.trim() || c.ocrText?.trim())
  );
  const canGenerate = hasQuestions && validCompanies.length > 0;

  const handleGenerateAll = async () => {
    if (!canGenerate) {
      alert('기본 답변 5문항과 회사 공고 내용을 최소 1개 이상 입력해주세요.');
      return;
    }

    try {
      await generateAllCompanies();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const isAnyGenerating =
    isBatchGenerating || Object.values(results).some((r) => r.status === 'generating');

  return (
    <div className="bg-zinc-950 text-zinc-100 rounded-2xl p-4 sm:p-6 border border-zinc-800/90 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
        {/* Left Info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-white">
              기업별 맞춤 자기소개서 생성 스튜디오
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
            작성된 기본 역량 5문항과 <b>{validCompanies.length}개 목표 기업</b>의 공고를 분석하여, 각 기업의 평가 기준 및 질문 의도에 최적화된 자소서를 문항별로 순차 생성합니다.
          </p>
          <div className="flex items-center gap-3 pt-0.5 text-xs text-zinc-400">
            <span>
              적용 프롬프트:{' '}
              <strong className="text-zinc-200 font-medium">{selectedTemplate.name}</strong>
            </span>
            <button
              type="button"
              onClick={onOpenPrompts}
              className="text-xs text-zinc-400 hover:text-white underline underline-offset-2 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <Sliders className="w-3 h-3" /> 변경
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 w-full lg:w-auto">
          {isAnyGenerating ? (
            <div className="flex items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
              <div className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-3 sm:px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400 shrink-0" />
                <span className="truncate">실시간 생성 중...</span>
              </div>
              <button
                type="button"
                onClick={cancelGeneration}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98]"
                title="진행 중인 자소서 생성을 즉시 중단하고 작성된 내용을 보존합니다"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>중단</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!canGenerate}
              onClick={handleGenerateAll}
              className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-zinc-950 hover:bg-zinc-100 active:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-xs sm:text-sm font-bold rounded-xl shadow-xs hover:shadow transition-all active:scale-[0.98]"
            >
              <span>전체 기업 자소서 일괄 생성</span>
            </button>
          )}
        </div>
      </div>

      {!canGenerate && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80 text-xs text-zinc-400 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>
            {!hasQuestions
              ? '기본 답변(섹션 1)을 먼저 작성하거나 [예시 채우기]를 클릭하세요.'
              : '최소 1개 이상의 회사명과 채용 공고(섹션 2)를 입력하세요.'}
          </span>
        </div>
      )}
    </div>
  );
};
