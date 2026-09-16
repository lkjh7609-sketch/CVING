import React from 'react';
import { useCompanyStore, MAX_COMPANIES } from '@/stores/companyStore';
import { CompanyCard } from './CompanyCard';
import { Plus, Sparkles, Building2 } from 'lucide-react';

export const CompanySection: React.FC = () => {
  const { companies, addCompany, loadSampleCompanies } = useCompanyStore();

  const canAdd = companies.length < MAX_COMPANIES;

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium tracking-wide bg-zinc-100 text-zinc-700 border border-zinc-200">
              STEP 02
            </span>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 tracking-tight">지원 기업 채용공고 분석 (최대 {MAX_COMPANIES}개)</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1 sm:mt-1.5 leading-relaxed">
            목표 기업의 채용 공고 텍스트 또는 캡처 이미지를 등록합니다. AI가 회사별 실제 문항과 인재상에 맞게 자소서를 재구성합니다.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="px-2 sm:px-2.5 py-1 bg-zinc-100/80 rounded-lg text-xs text-zinc-600 font-medium border border-zinc-200/50">
            등록: <span className="font-semibold text-zinc-900">{companies.length}</span> / {MAX_COMPANIES}개
          </div>

          <button
            type="button"
            onClick={loadSampleCompanies}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200 shadow-2xs"
            title="실제 채용공고 샘플 회사(네이버페이, 토스)를 불러옵니다"
          >
            <Building2 className="w-3.5 h-3.5 text-zinc-500" />
            <span>샘플 불러오기</span>
          </button>

          <button
            type="button"
            disabled={!canAdd}
            onClick={() => addCompany()}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>회사 추가</span>
          </button>
        </div>
      </div>

      {/* Companies List */}
      <div className="space-y-4">
        {companies.map((company, index) => (
          <CompanyCard key={company.id} company={company} index={index} />
        ))}
      </div>
    </section>
  );
};
