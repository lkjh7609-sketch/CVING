import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { QuestionSection } from '@/components/QuestionSection';
import { CompanySection } from '@/components/CompanySection';
import { GenerationControl } from '@/components/GenerationControl';
import { ResultTabs } from '@/components/ResultTabs';
import { SettingsModal } from '@/components/SettingsModal';
import { PromptModal } from '@/components/PromptModal';
import { GuideModal } from '@/components/GuideModal';
import { useCompanyStore } from '@/stores/companyStore';
import { ShieldCheck, Heart } from 'lucide-react';

export function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPromptsOpen, setIsPromptsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const { initializeImagesFromStorage } = useCompanyStore();

  // Restore screenshot blobs from IndexedDB on initial load
  useEffect(() => {
    initializeImagesFromStorage();
  }, [initializeImagesFromStorage]);

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] text-zinc-900 font-sans selection:bg-zinc-200 selection:text-zinc-900">
      {/* Top Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPrompts={() => setIsPromptsOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Section 1: Basic Questions (5 prompts) */}
        <QuestionSection />

        {/* Section 2: Target Companies (up to 5) & OCR */}
        <CompanySection />

        {/* Action Trigger Bar */}
        <GenerationControl onOpenPrompts={() => setIsPromptsOpen(true)} />

        {/* Section 3: Generation Results & Export */}
        <ResultTabs />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200/80 py-6 mt-12 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
            <span className="font-mono text-zinc-900 font-semibold tracking-tight">CVING</span>
            <span>&copy; {new Date().getFullYear()} Ben Lee. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>개인정보 안심: 모든 답변과 이미지는 브라우저(LocalStorage / IndexedDB)에만 안전하게 저장됩니다.</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <PromptModal isOpen={isPromptsOpen} onClose={() => setIsPromptsOpen(false)} />
      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}

export default App;
