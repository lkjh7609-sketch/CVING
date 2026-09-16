import React, { useState } from 'react';
import { Company } from '@/lib/types';
import { useCompanyStore } from '@/stores/companyStore';
import { OCRProcessor } from './OCRProcessor';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Briefcase,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { countCharacters } from '@/lib/utils';

interface CompanyCardProps {
  company: Company;
  index: number;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company, index }) => {
  const { updateCompany, removeCompany } = useCompanyStore();
  const [isExpanded, setIsExpanded] = useState(true);

  const charCount = countCharacters(company.jobPostingText || '');
  const isReady = Boolean(company.name.trim() && charCount >= 30);

  const handleApplyOcr = (extractedText: string) => {
    const current = company.jobPostingText ? `${company.jobPostingText}\n\n` : '';
    updateCompany(company.id, {
      jobPostingText: `${current}[스크린샷 추출 공고]\n${extractedText}`,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all hover:border-zinc-300 overflow-hidden">
      {/* Card Header */}
      <div className="p-3.5 sm:p-4 bg-zinc-50/60 border-b border-zinc-200/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex items-center justify-center w-6 h-6 rounded bg-zinc-100 text-zinc-700 border border-zinc-200/70 font-mono text-xs font-medium shrink-0">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <span className="font-semibold text-sm text-zinc-900 truncate">
              {company.name || `목표 기업 ${index + 1}`}
            </span>
            {company.targetRole && (
              <span className="text-xs text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded font-normal border border-zinc-200/50 truncate">
                {company.targetRole}
              </span>
            )}
          </div>
        </div>

        {/* Status & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isReady ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> 공고 준비됨
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-normal text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              <AlertCircle className="w-3 h-3" /> 공고 입력 필요
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
            title={isExpanded ? '접기' : '펼치기'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm(`'${company.name}' 회사를 삭제하시겠습니까?`)) {
                removeCompany(company.id);
              }
            }}
            className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
            title="회사 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card Body */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Company Name & Role inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                회사명 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) => updateCompany(company.id, { name: e.target.value })}
                  placeholder="예: 카카오, 네이버, 삼성전자..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                지원 직무
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={company.targetRole || ''}
                  onChange={(e) => updateCompany(company.id, { targetRole: e.target.value })}
                  placeholder="예: 프론트엔드 개발자, 서비스 기획..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                />
              </div>
            </div>
          </div>

          {/* Job Posting Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                채용 공고 내용 (직무 요건, 우대사항, 실제 자소서 문항 등)
              </label>
              <span className="text-xs text-zinc-400 font-mono">
                {charCount.toLocaleString()}자
              </span>
            </div>
            <textarea
              value={company.jobPostingText}
              onChange={(e) => updateCompany(company.id, { jobPostingText: e.target.value })}
              rows={5}
              placeholder="채용공고의 주요 업무, 지원 자격, 우대 사항, 인재상 또는 회사의 고유 자기소개서 문항을 텍스트로 붙여넣으세요. 아래 OCR 기능을 사용해 스크린샷에서 바로 추출할 수도 있습니다."
              className="w-full p-3 text-xs leading-relaxed text-zinc-800 placeholder-zinc-400 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 resize-y font-sans"
            />
          </div>

          {/* OCR Section */}
          <OCRProcessor company={company} onApplyToJobPosting={handleApplyOcr} />
        </div>
      )}
    </div>
  );
};
