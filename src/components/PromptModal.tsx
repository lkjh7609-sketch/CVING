import React, { useState } from 'react';
import { usePromptStore } from '@/stores/promptStore';
import { X, Sparkles, Check, RotateCcw, Plus, Trash2 } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onClose }) => {
  const {
    templates,
    selectedTemplateId,
    selectTemplate,
    updateTemplate,
    addTemplate,
    deleteTemplate,
    resetToDefault,
    getSelectedTemplate,
  } = usePromptStore();

  const currentTemplate = getSelectedTemplate();

  const [systemPrompt, setSystemPrompt] = useState(currentTemplate.systemPrompt);
  const [userTemplate, setUserTemplate] = useState(currentTemplate.userPromptTemplate);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Sync state when template changes
  React.useEffect(() => {
    setSystemPrompt(currentTemplate.systemPrompt);
    setUserTemplate(currentTemplate.userPromptTemplate);
  }, [currentTemplate.id]);

  if (!isOpen) return null;

  const handleSaveCurrent = () => {
    updateTemplate(currentTemplate.id, {
      systemPrompt,
      userPromptTemplate: userTemplate,
    });
    alert('프롬프트 설정이 저장되었습니다.');
  };

  const handleCreateNew = () => {
    if (!newName.trim()) {
      alert('템플릿 이름을 입력해주세요.');
      return;
    }
    addTemplate({
      name: newName.trim(),
      description: newDesc.trim() || '사용자 정의 커스텀 프롬프트',
      systemPrompt,
      userPromptTemplate: userTemplate,
    });
    setIsAddingNew(false);
    setNewName('');
    setNewDesc('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-zinc-200 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/60">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200/60 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-semibold text-zinc-900 tracking-tight truncate">AI 프롬프트 설정 & 프리셋</h2>
              <p className="text-[11px] sm:text-xs text-zinc-500 truncate">
                자기소개서 작성 시 AI에게 전달되는 시스템 페르소나와 프롬프트 형식을 제어합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* Preset Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                프롬프트 프리셋 선택
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-900 hover:text-zinc-700 underline"
                >
                  <Plus className="w-3.5 h-3.5" /> 새 프리셋으로 추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('기본 프롬프트로 초기화하시겠습니까?')) {
                      resetToDefault();
                    }
                  }}
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 초기화
                </button>
              </div>
            </div>

            {/* New Preset Creation inline */}
            {isAddingNew && (
              <div className="p-3 mb-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-zinc-900">새 프리셋 등록</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="프리셋 이름 (예: 외국계 IT 기업 특화)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  />
                  <input
                    type="text"
                    placeholder="간략 설명"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="px-3 py-1 text-xs bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-2.5 py-1 text-xs bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-lg"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {templates.map((tpl) => {
                const isSelected = tpl.id === selectedTemplateId;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => selectTemplate(tpl.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900 shadow-2xs'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-zinc-900 flex items-center gap-1.5">
                          {tpl.name}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px]">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    {!tpl.isDefault && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`'${tpl.name}' 프리셋을 삭제하시겠습니까?`)) {
                            deleteTemplate(tpl.id);
                          }
                        }}
                        className="mt-2 text-right text-[11px] text-zinc-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 inline mr-1" /> 삭제
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Prompt Editor */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              시스템 프롬프트 (System Persona & Role)
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              className="w-full p-3 text-xs leading-relaxed font-mono text-zinc-900 bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>

          {/* User Prompt Template Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                사용자 프롬프트 템플릿
              </label>
              <span className="text-[11px] text-zinc-400">
                치환 변수: <code className="text-zinc-800 font-mono">&#123;&#123;COMPANY_INFO&#125;&#125;</code>,{' '}
                <code className="text-zinc-800 font-mono">&#123;&#123;BASE_ANSWERS&#125;&#125;</code>
              </span>
            </div>
            <textarea
              value={userTemplate}
              onChange={(e) => setUserTemplate(e.target.value)}
              rows={4}
              className="w-full p-3 text-xs leading-relaxed font-mono text-zinc-900 bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-medium text-zinc-600 hover:text-zinc-800 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            닫기
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveCurrent}
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-2xs transition-colors"
            >
              현재 프리셋에 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
