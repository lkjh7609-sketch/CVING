import React from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useQuestionStore } from '@/stores/questionStore';
import { useResultStore } from '@/stores/resultStore';
import {
  FileCheck2,
  Settings,
  HelpCircle,
  Sparkles,
  Sliders,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenPrompts: () => void;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenPrompts,
  onOpenGuide,
}) => {
  const { settings } = useSettingsStore();
  const { resetCompanies } = useCompanyStore();
  const { resetAnswers } = useQuestionStore();
  const { clearAllResults } = useResultStore();

  const handleResetAll = () => {
    if (
      window.confirm(
        '모든 기본 답변, 회사 공고 및 생성 결과를 초기화하시겠습니까? (되돌릴 수 없습니다)'
      )
    ) {
      resetAnswers();
      resetCompanies();
      clearAllResults();
      alert('모든 데이터가 초기화되었습니다.');
    }
  };

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-zinc-200/80 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 select-none">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs shrink-0 ring-1 ring-zinc-800/80">
            <FileCheck2 className="w-4 h-4 text-zinc-100" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold tracking-tight text-zinc-950">
              CVING
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold px-2 py-0.5 bg-zinc-100 rounded-md border border-zinc-200/70">
              STUDIO
            </span>
          </div>
        </div>

        {/* Status Indicators & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Demo Mode / API Key Status Badge */}
          {settings.isDemoMode ? (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 text-zinc-600 border border-zinc-200/80 select-none cursor-default"
              title="현재 시뮬레이션 데모 모드로 실행 중입니다 (설정에서 API 키 등록 가능)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>데모 모드</span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200/80 select-none cursor-default"
              title="API 키가 설정되어 활성화되었습니다"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {settings.provider === 'gemini'
                  ? 'Gemini'
                  : settings.provider === 'anthropic'
                  ? 'Claude'
                  : 'OpenAI'}{' '}
                연결됨
              </span>
            </div>
          )}

          {/* Guide Button */}
          <button
            type="button"
            onClick={onOpenGuide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors border border-transparent hover:border-zinc-200"
            title="사용 가이드"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">가이드</span>
          </button>

          {/* Prompt Templates Button */}
          <button
            type="button"
            onClick={onOpenPrompts}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors border border-transparent hover:border-zinc-200"
            title="프롬프트 설정"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">프롬프트</span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200 rounded-lg transition-colors shadow-2xs"
            title="API 및 환경 설정"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-700" />
            <span className="hidden sm:inline">설정</span>
          </button>

          {/* Global Reset */}
          <button
            type="button"
            onClick={handleResetAll}
            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-0.5"
            title="모든 데이터 초기화"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
