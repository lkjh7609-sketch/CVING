import React from 'react';
import { countCharacters } from '@/lib/utils';
import { useQuestionStore } from '@/stores/questionStore';

interface CharacterCounterProps {
  text: string;
  maxLength?: number;
  className?: string;
  showToggle?: boolean;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({
  text,
  maxLength = 1000,
  className = '',
  showToggle = false,
}) => {
  const { includeSpaces, setIncludeSpaces } = useQuestionStore();

  const currentCount = countCharacters(text, includeSpaces);
  const percentage = Math.min(100, Math.round((currentCount / maxLength) * 100));
  const isOver = currentCount > maxLength;

  return (
    <div className={`flex flex-col gap-1.5 text-xs select-none ${className}`}>
      <div className="flex items-center justify-between text-zinc-500">
        <div className="flex items-center gap-2">
          {showToggle && (
            <button
              type="button"
              onClick={() => setIncludeSpaces(!includeSpaces)}
              className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 font-medium transition-colors border border-zinc-200/60"
              title="클릭하여 공백 포함/제외 전환"
            >
              {includeSpaces ? '공백 포함' : '공백 제외'}
            </button>
          )}
        </div>
        <div className="font-mono text-xs">
          <span className={isOver ? 'text-rose-600 font-semibold' : 'text-zinc-900 font-semibold'}>
            {currentCount.toLocaleString()}
          </span>
          <span className="text-zinc-400"> / {maxLength.toLocaleString()}자</span>
          {isOver && (
            <span className="ml-1.5 text-rose-600 font-medium bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded text-[11px]">
              +{currentCount - maxLength}자 초과
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
        <div
          className={`h-full transition-all duration-200 rounded-full ${
            isOver
              ? 'bg-rose-500'
              : percentage > 90
              ? 'bg-amber-500'
              : 'bg-zinc-800'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
