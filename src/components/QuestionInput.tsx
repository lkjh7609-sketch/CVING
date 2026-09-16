import React, { useState } from 'react';
import { Question } from '@/lib/types';
import { CharacterCounter } from './CharacterCounter';
import { useQuestionStore } from '@/stores/questionStore';
import { countCharacters } from '@/lib/utils';
import { CheckCircle2, Circle, Edit3, RotateCcw } from 'lucide-react';

interface QuestionInputProps {
  question: Question;
  index: number;
}

export const QuestionInput: React.FC<QuestionInputProps> = ({ question, index }) => {
  const { updateQuestionAnswer, updateQuestionTitle, updateQuestionMaxLength, includeSpaces } =
    useQuestionStore();

  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editedTitle, setEditedTitle] = useState(question.title);
  const [editedMaxLength, setEditedMaxLength] = useState(question.maxLength.toString());

  const currentLength = countCharacters(question.answer, includeSpaces);
  const isCompleted = currentLength >= 300;
  const isStarted = currentLength > 0;

  const handleSaveMeta = () => {
    const max = parseInt(editedMaxLength, 10);
    if (!isNaN(max) && max > 0) {
      updateQuestionMaxLength(question.id, max);
    }
    if (editedTitle.trim()) {
      updateQuestionTitle(question.id, editedTitle.trim());
    }
    setIsEditingMeta(false);
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all hover:border-zinc-300 overflow-hidden">
      {/* Question Header */}
      <div className="p-3.5 sm:p-4 bg-zinc-50/60 border-b border-zinc-200/80">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {isEditingMeta ? (
              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs sm:text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-medium"
                  placeholder="문항 제목"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-500 whitespace-nowrap">최대 글자수:</span>
                  <input
                    type="number"
                    value={editedMaxLength}
                    onChange={(e) => setEditedMaxLength(e.target.value)}
                    className="w-24 px-2 py-1.5 text-xs sm:text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-mono"
                    min={100}
                    max={5000}
                    step={100}
                  />
                  <button
                    onClick={handleSaveMeta}
                    className="px-3 py-1.5 text-xs bg-zinc-900 text-white font-medium rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setEditedTitle(question.title);
                      setEditedMaxLength(question.maxLength.toString());
                      setIsEditingMeta(false);
                    }}
                    className="px-2.5 py-1.5 text-xs bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-900 leading-snug">
                    {question.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingMeta(true)}
                    className="text-zinc-400 hover:text-zinc-600 p-1 rounded transition-colors"
                    title="문항 제목 및 최대 글자수 수정"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{question.description}</p>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> 작성 완료
              </span>
            ) : isStarted ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                <Circle className="w-3 h-3 fill-zinc-400 text-zinc-400" /> 작성 중
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-normal bg-zinc-50 text-zinc-400 border border-zinc-200/70">
                미작성
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Answer Textarea */}
      <div className="p-4">
        <textarea
          value={question.answer}
          onChange={(e) => updateQuestionAnswer(question.id, e.target.value)}
          rows={6}
          className="w-full p-3.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 resize-y leading-relaxed transition-all font-sans"
          placeholder={`${question.title}에 대한 본인의 진솔한 경험과 역량을 자유롭게 작성하세요...`}
        />

        {/* Bottom Bar: Character Counter & Actions */}
        <div className="mt-3 pt-2.5 border-t border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-sm">
            <CharacterCounter
              text={question.answer}
              maxLength={question.maxLength}
              showToggle={index === 0}
            />
          </div>

          {question.answer && (
            <button
              type="button"
              onClick={() => updateQuestionAnswer(question.id, '')}
              className="inline-flex items-center justify-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors py-1 px-2 rounded hover:bg-zinc-50"
              title="이 문항 답변 비우기"
            >
              <RotateCcw className="w-3 h-3" /> 초기화
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
