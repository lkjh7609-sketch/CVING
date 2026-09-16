import React from 'react';
import { useQuestionStore } from '@/stores/questionStore';
import { QuestionInput } from './QuestionInput';
import { Sparkles, Trash2, BookOpen, CheckCircle } from 'lucide-react';
import { countCharacters } from '@/lib/utils';

export const QuestionSection: React.FC = () => {
  const { questions, loadSampleAnswers, resetAnswers, includeSpaces } = useQuestionStore();

  const completedCount = questions.filter(
    (q) => countCharacters(q.answer, includeSpaces) >= 200
  ).length;

  const totalCharacters = questions.reduce(
    (acc, q) => acc + countCharacters(q.answer, includeSpaces),
    0
  );

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-zinc-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/70">
              STEP 01
            </span>
            <h2 className="text-base font-bold text-zinc-900 tracking-tight">
              기본 역량 답변 (핵심 경험 5문항)
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
            지원할 모든 기업의 자소서에 반영될 본인의 핵심 프로젝트와 역량을 5개 기본 문항에 나누어 입력합니다.
          </p>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100/80 rounded-lg text-xs text-zinc-700 font-medium">
            <CheckCircle className="w-3.5 h-3.5 text-zinc-500" />
            <span>작성 완료:</span>
            <span className="font-bold text-zinc-900 font-mono">
              {completedCount} / {questions.length}
            </span>
            <span className="text-zinc-300">|</span>
            <span className="text-zinc-500 font-mono">총 {totalCharacters.toLocaleString()}자</span>
          </div>

          <button
            type="button"
            onClick={loadSampleAnswers}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200/80 rounded-lg transition-colors border border-zinc-200 shadow-2xs"
            title="테스트용 예시 기본 답변 5개를 즉시 채웁니다"
          >
            <span>예시 채우기</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('기본 답변 5문항의 내용을 모두 지우시겠습니까?')) {
                resetAnswers();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="5개 문항 모두 초기화"
          >
            <Trash2 className="w-3.5 h-3.5" /> 비우기
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((question, index) => (
          <QuestionInput key={question.id} question={question} index={index} />
        ))}
      </div>
    </section>
  );
};
