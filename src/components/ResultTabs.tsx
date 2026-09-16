import React, { useState, useEffect } from 'react';
import { useResultStore } from '@/stores/resultStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { downloadFile, downloadZip, countCharacters, formatDate } from '@/lib/utils';
import confetti from 'canvas-confetti';
import {
  Copy,
  Check,
  Download,
  Archive,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileText,
  Sparkles,
  ExternalLink,
  StopCircle,
  Square,
} from 'lucide-react';

export const ResultTabs: React.FC = () => {
  const { companies } = useCompanyStore();
  const {
    results,
    activeTabCompanyId,
    setActiveTabCompanyId,
    generateForCompany,
    cancelGeneration,
    isBatchGenerating,
  } = useResultStore();

  const [copied, setCopied] = useState(false);

  // Set default active tab if none selected
  useEffect(() => {
    if (!activeTabCompanyId && companies.length > 0) {
      setActiveTabCompanyId(companies[0].id);
    } else if (
      activeTabCompanyId &&
      !companies.some((c) => c.id === activeTabCompanyId)
    ) {
      setActiveTabCompanyId(companies[0]?.id || null);
    }
  }, [companies, activeTabCompanyId, setActiveTabCompanyId]);

  const activeCompany = companies.find((c) => c.id === activeTabCompanyId);
  const activeResult = activeCompany ? results[activeCompany.id] : null;
  const currentContent = activeResult?.streamedContent || activeResult?.content || '';

  // Copy to clipboard
  const handleCopy = async () => {
    if (!currentContent) return;
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Download single text file
  const handleDownloadTxt = () => {
    if (!activeCompany || !currentContent) return;
    const filename = `${activeCompany.name}_${activeCompany.targetRole || '자기소개서'}.txt`;
    downloadFile(filename, currentContent);
  };

  // Download single markdown file
  const handleDownloadMd = () => {
    if (!activeCompany || !currentContent) return;
    const filename = `${activeCompany.name}_${activeCompany.targetRole || '자기소개서'}.md`;
    downloadFile(filename, currentContent, 'text/markdown;charset=utf-8');
  };

  // Batch download ZIP
  const handleDownloadAllZip = async () => {
    const filesToZip: { filename: string; content: string }[] = [];

    companies.forEach((comp) => {
      const res = results[comp.id];
      if (res?.content) {
        filesToZip.push({
          filename: `${comp.name}_${comp.targetRole || '자기소개서'}.txt`,
          content: res.content,
        });
      }
    });

    if (filesToZip.length === 0) {
      alert('다운로드할 생성 완료된 자기소개서가 없습니다. 먼저 생성을 진행해주세요.');
      return;
    }

    try {
      await downloadZip(filesToZip, `CVING_자기소개서_일괄_${new Date().toISOString().slice(0, 10)}.zip`);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    } catch (err) {
      console.error('ZIP download error:', err);
      alert('압축 파일 생성에 실패했습니다.');
    }
  };

  const hasAnySuccess = Object.values(results).some((r) => r.status === 'success');
  const charLength = countCharacters(currentContent);

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium tracking-wide bg-zinc-100 text-zinc-700 border border-zinc-200">
              STEP 03
            </span>
            <h2 className="text-base font-semibold text-zinc-900 tracking-tight">생성 결과 관리 및 내보내기</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1 pl-[70px]">
            회사별 맞춤 자기소개서를 확인하고 실시간 수정, 복사, 개별 다운로드 및 ZIP 일괄 다운로드를 수행합니다.
          </p>
        </div>

        {/* Global Batch Download Action */}
        <div className="flex items-center gap-2 pl-[70px] md:pl-0">
          <button
            type="button"
            disabled={!hasAnySuccess}
            onClick={handleDownloadAllZip}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed rounded-lg transition-all shadow-2xs"
            title="생성 완료된 모든 회사의 자소서를 ZIP 압축 파일로 일괄 다운로드합니다"
          >
            <Archive className="w-3.5 h-3.5" /> 전체 ZIP 일괄 다운로드
          </button>
        </div>
      </div>

      {/* Main Results Container */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col min-h-[500px]">
        {/* Company Tabs Bar */}
        <div className="flex items-center gap-1.5 px-4 pt-3 bg-zinc-50/60 border-b border-zinc-200 overflow-x-auto">
          {companies.length === 0 ? (
            <div className="py-2 text-xs text-zinc-400">등록된 회사가 없습니다.</div>
          ) : (
            companies.map((company) => {
              const res = results[company.id];
              const isSelected = company.id === activeTabCompanyId;

              return (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => setActiveTabCompanyId(company.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap border-b-2 ${
                    isSelected
                      ? 'bg-white text-zinc-900 border-zinc-900 font-semibold shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-800 border-transparent hover:bg-zinc-100/60'
                  }`}
                >
                  <span>{company.name}</span>

                  {/* Status Indicator inside tab */}
                  {res?.status === 'generating' && (
                    <Loader2 className="w-3 h-3 animate-spin text-zinc-900" />
                  )}
                  {res?.status === 'success' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="생성 완료" />
                  )}
                  {res?.status === 'error' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="생성 실패" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Content Pane */}
        {activeCompany ? (
          <div className="flex-1 flex flex-col">
            {/* Action Bar for Current Active Company */}
            <div className="p-3.5 sm:p-4 border-b border-zinc-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-zinc-900">{activeCompany.name}</h3>
                  {activeCompany.targetRole && (
                    <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded font-normal border border-zinc-200/50">
                      {activeCompany.targetRole}
                    </span>
                  )}
                </div>
                {activeResult?.updatedAt && (
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                    생성: {formatDate(activeResult.updatedAt)}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Character Count */}
                {currentContent && (
                  <span className="text-xs text-zinc-600 font-mono px-2.5 py-1 bg-zinc-100 rounded-lg border border-zinc-200/50">
                    총 {charLength.toLocaleString()}자
                  </span>
                )}

                {/* Stop Generation button (during generation) or Regenerate */}
                {activeResult?.status === 'generating' || isBatchGenerating ? (
                  <button
                    type="button"
                    onClick={cancelGeneration}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-all"
                    title="현재 진행 중인 생성을 즉시 중단하고 지금까지 작성된 내용을 유지합니다"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" /> 생성 중단
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => generateForCompany(activeCompany.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 rounded-lg transition-colors border border-zinc-200/60"
                    title="이 회사만 다시 생성합니다"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> 재생성
                  </button>
                )}

                {/* Copy Button */}
                <button
                  type="button"
                  disabled={!currentContent}
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-800 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors border border-zinc-200/80"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> 복사 완료
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-500" /> 복사하기
                    </>
                  )}
                </button>

                {/* Download Text */}
                <button
                  type="button"
                  disabled={!currentContent}
                  onClick={handleDownloadTxt}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 disabled:opacity-40 rounded-lg transition-colors border border-zinc-200"
                  title="텍스트 파일(.txt)로 저장"
                >
                  <Download className="w-3 h-3" /> TXT
                </button>

                {/* Download Markdown */}
                <button
                  type="button"
                  disabled={!currentContent}
                  onClick={handleDownloadMd}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 disabled:opacity-40 rounded-lg transition-colors border border-zinc-200"
                  title="마크다운 파일(.md)로 저장"
                >
                  <FileText className="w-3 h-3" /> MD
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6 overflow-y-auto">
              {/* Active streaming notification banner */}
              {activeResult?.status === 'generating' && currentContent && (
                <div className="mb-4 flex items-center justify-between p-3 bg-zinc-100/90 border border-zinc-200 rounded-xl">
                  <div className="flex items-center gap-2 text-xs text-zinc-800 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-900" />
                    <span>문항별 순차 스트리밍 생성 중...</span>
                  </div>
                  <button
                    type="button"
                    onClick={cancelGeneration}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-md transition-colors shadow-2xs"
                  >
                    <Square className="w-3 h-3 fill-current" /> 생성 중단
                  </button>
                </div>
              )}

              {activeResult?.status === 'generating' && !currentContent && (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-400 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-900" />
                  <p className="text-xs sm:text-sm font-medium text-zinc-600">
                    {activeCompany.name} 공고와 기본 답변을 분석하여 맞춤 자기소개서를 생성하는 중입니다...
                  </p>
                  <button
                    type="button"
                    onClick={cancelGeneration}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors"
                  >
                    <Square className="w-3 h-3 fill-current" /> 생성 중단하기
                  </button>
                </div>
              )}

              {activeResult?.status === 'error' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-rose-900">
                    <AlertCircle className="w-4 h-4" /> 생성 오류 발생
                  </div>
                  <p>{activeResult.error || '자소서 생성 도중 문제가 발생했습니다.'}</p>
                  <button
                    type="button"
                    onClick={() => generateForCompany(activeCompany.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> 다시 시도
                  </button>
                </div>
              )}

              {currentContent ? (
                <div className="prose prose-sm max-w-none text-zinc-800 leading-relaxed font-sans whitespace-pre-wrap selection:bg-zinc-200">
                  {currentContent}
                  {activeResult?.status === 'generating' && (
                    <span className="inline-block w-1.5 h-4 ml-1 bg-zinc-900 animate-pulse align-middle" />
                  )}
                </div>
              ) : (
                !activeResult || activeResult.status === 'idle' ? (
                  <div className="h-64 flex flex-col items-center justify-center text-zinc-400 gap-3 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/40">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center border border-zinc-200">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-800">
                        {activeCompany.name}에 최적화된 자기소개서가 아직 생성되지 않았습니다.
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        위 또는 아래의 생성 버튼을 눌러 회사 맞춤형 자소서를 완성해보세요.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isBatchGenerating}
                      onClick={() => generateForCompany(activeCompany.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs rounded-lg shadow-2xs transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" /> 이 회사 자소서 생성하기
                    </button>
                  </div>
                ) : null
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-400 text-sm">
            상단 탭에서 회사를 선택해주세요.
          </div>
        )}
      </div>
    </section>
  );
};
