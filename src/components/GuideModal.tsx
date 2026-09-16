import React from 'react';
import { X, CheckCircle2, Sparkles, Image, Zap, FileDown } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-zinc-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200/60 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight">CVING 사용 가이드</h2>
              <p className="text-xs text-zinc-500">맞춤형 자기소개서 작성 4단계 워크플로우</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 text-xs leading-relaxed text-zinc-700">
          {/* Step 1 */}
          <div className="flex gap-3 p-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200">
            <span className="w-6 h-6 rounded bg-zinc-100 text-zinc-700 font-mono text-xs font-semibold flex items-center justify-center shrink-0 border border-zinc-200">
              01
            </span>
            <div>
              <h4 className="font-semibold text-zinc-900 text-sm mb-1">기본 문항 답변 작성</h4>
              <p className="text-zinc-600">
                지원동기, 직무역량, 도전경험, 협업사례, 가치관에 대한 본인의 진솔한 경험을 작성합니다.
                상단 <b>[예시 채우기]</b> 버튼을 누르면 완성도 높은 템플릿 예시가 즉시 채워집니다.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3 p-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200">
            <span className="w-6 h-6 rounded bg-zinc-100 text-zinc-700 font-mono text-xs font-semibold flex items-center justify-center shrink-0 border border-zinc-200">
              02
            </span>
            <div>
              <h4 className="font-semibold text-zinc-900 text-sm mb-1">지원 기업 공고 등록 & OCR</h4>
              <p className="text-zinc-600">
                최대 5개 회사의 공고를 등록할 수 있습니다. 채용공고 텍스트를 직접 붙여넣거나,
                공고 스크린샷 이미지를 업로드/붙여넣기(Ctrl+V)하면 멀티모달 비전 또는 클라이언트 OCR이 한글/영어 텍스트를 자동 추출합니다.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3 p-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200">
            <span className="w-6 h-6 rounded bg-zinc-100 text-zinc-700 font-mono text-xs font-semibold flex items-center justify-center shrink-0 border border-zinc-200">
              03
            </span>
            <div>
              <h4 className="font-semibold text-zinc-900 text-sm mb-1">AI 맞춤형 자소서 생성</h4>
              <p className="text-zinc-600">
                <b>[전체 자소서 일괄 생성]</b> 또는 개별 회사 <b>[재생성]</b>을 클릭하면 AI가 회사의 실제 채용 요건과 인재상을 분석하여 지원자의 기본 답변을 최적의 문항과 STAR 서사로 재구성하여 문항별로 실시간 스트리밍합니다. 언제든지 중단할 수 있습니다.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-3 p-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200">
            <span className="w-6 h-6 rounded bg-zinc-100 text-zinc-700 font-mono text-xs font-semibold flex items-center justify-center shrink-0 border border-zinc-200">
              04
            </span>
            <div>
              <h4 className="font-semibold text-zinc-900 text-sm mb-1">결과 확인, 복사 & ZIP 일괄 다운로드</h4>
              <p className="text-zinc-600">
                회사별 탭을 클릭하여 완성된 자소서를 확인하고, 원클릭으로 클립보드에 복사하거나 텍스트(.txt)/마크다운(.md)으로 저장할 수 있습니다. <b>[전체 ZIP 일괄 다운로드]</b>로 모든 회사의 자소서를 한 번에 압축하여 다운로드할 수 있습니다.
              </p>
            </div>
          </div>

          {/* Tips */}
          <div className="p-3.5 rounded-xl bg-zinc-100/70 border border-zinc-200 text-zinc-700">
            <div className="font-semibold mb-1 flex items-center gap-1.5 text-zinc-900 text-xs">
              안내 사항
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-600">
              <li>API 키 없이도 <b>스마트 시뮬레이션 (데모 모드)</b>를 통해 스트리밍 타이핑 및 생성 흐름을 완벽히 체험할 수 있습니다.</li>
              <li>작성 중인 모든 문항과 회사 데이터, 업로드된 이미지는 브라우저의 <b>LocalStorage 및 IndexedDB</b>에 안전하게 자동 저장됩니다.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-200 bg-zinc-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors shadow-2xs"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
};
