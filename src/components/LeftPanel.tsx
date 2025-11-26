
import React from 'react';
import { Tool, HistoryStep } from '../types';
import { MaskIcon, GenerateIcon, DownloadIcon, ApplyIcon, ScaleUpIcon, RestartIcon, SettingsIcon } from './icons';

interface LeftPanelProps {
  activeTool: Tool;
  onSelectTool: (tool: Tool) => void;
  onGenerate: () => void;
  isLoading: boolean;
  onDownload: () => void;
  showDownload: boolean;
  onApply: () => void;
  history: HistoryStep[];
  currentHistoryIndex: number;
  onHistorySelect: (index: number) => void;
  onUpscale: (resolution: '2K' | '4K') => void;
  onReset: () => void;
  onOpenSettings: () => void;
}

const ToolButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center p-3 rounded-lg text-left transition-all duration-200 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-lg'
        : 'hover:bg-gray-700 text-gray-300'
    }`}
  >
    {icon}
    <span className="ml-4 font-medium">{label}</span>
  </button>
);

const HistoryItem: React.FC<{
  step: HistoryStep;
  index: number;
  isActive: boolean;
  onClick: () => void;
}> = ({ step, index, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex flex-col p-3 rounded-md text-sm mb-2 transition-colors duration-200 text-left border border-transparent ${
      isActive 
        ? 'bg-gray-700 border-indigo-500 shadow-md' 
        : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
    }`}
  >
    <div className="flex items-center mb-1">
        <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${isActive ? 'bg-indigo-400' : 'bg-gray-500'}`} />
        <span className={`font-semibold ${isActive ? 'text-white' : 'text-gray-400'}`}>
            {index === 0 ? '원본 이미지' : `단계 ${index}`}
        </span>
    </div>
    {step.prompt && (
        <p className="text-xs text-gray-400 ml-4 truncate w-full pr-2 italic">
            "{step.prompt}"
        </p>
    )}
  </button>
);

const LeftPanel: React.FC<LeftPanelProps> = ({ 
  activeTool, 
  onSelectTool, 
  onGenerate, 
  isLoading, 
  onDownload, 
  showDownload, 
  onApply,
  history,
  currentHistoryIndex,
  onHistorySelect,
  onUpscale,
  onReset,
  onOpenSettings
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-full shadow-xl">
      
      {/* Top Action Section */}
      <div className="flex-shrink-0 mb-4">
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center p-2 rounded-lg bg-gray-700 hover:bg-red-900/50 text-gray-300 hover:text-red-200 text-sm font-medium transition-colors border border-gray-600 hover:border-red-800/50"
          title="모든 작업을 초기화하고 처음으로 돌아갑니다"
        >
          <RestartIcon className="w-4 h-4 mr-2" />
          처음부터 시작하기
        </button>
      </div>

      {/* Tools Section */}
      <div className="flex-shrink-0 space-y-2 mb-4">
        <h2 className="text-lg font-semibold mb-2 text-white">편집 도구</h2>
        <ToolButton
          label="마스킹 툴"
          icon={<MaskIcon />}
          isActive={activeTool === Tool.MASK}
          onClick={() => onSelectTool(Tool.MASK)}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex-shrink-0 space-y-2 mb-6 border-b border-gray-700 pb-6">
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full flex items-center justify-center p-3 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold transition-all duration-200 shadow-lg"
        >
          <GenerateIcon />
          <span className="ml-3">{isLoading ? '생성 중...' : '생성하기'}</span>
        </button>
        
        {showDownload && (
          <>
             <button
                onClick={onApply}
                disabled={isLoading}
                className={`w-full flex items-center justify-center p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`} 
              >
                <ApplyIcon />
                <span className="ml-2">이어서 수정하기</span>
              </button>

              <button
                onClick={onDownload}
                className="w-full flex items-center justify-center p-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all duration-200 shadow-lg"
              >
                <DownloadIcon />
                <span className="ml-2">다운로드</span>
              </button>

              {/* Upscale Section */}
              <div className="pt-4 mt-2 border-t border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                    <ScaleUpIcon className="w-4 h-4 mr-1" />
                    해상도 업스케일
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onUpscale('2K')}
                        disabled={isLoading}
                        className="flex items-center justify-center p-2 rounded-lg bg-gray-700 hover:bg-indigo-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600"
                    >
                        2K 변환
                    </button>
                    <button
                        onClick={() => onUpscale('4K')}
                        disabled={isLoading}
                        className="flex items-center justify-center p-2 rounded-lg bg-gray-700 hover:bg-purple-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600"
                    >
                        4K 변환
                    </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">* 고해상도 생성은 별도 과금이 발생할 수 있습니다.</p>
              </div>
          </>
        )}
      </div>

      {/* History Section */}
      <div className="flex-grow flex flex-col min-h-0">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">작업 히스토리</h3>
        <div className="overflow-y-auto flex-grow pr-1 custom-scrollbar">
          {history.length === 0 ? (
            <div className="text-center text-gray-500 py-4 text-sm">
              이미지를 업로드하면<br/>히스토리가 표시됩니다.
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-1">
               {history.map((step, idx) => (
                 <HistoryItem
                   key={idx}
                   step={step}
                   index={idx}
                   isActive={idx === currentHistoryIndex}
                   onClick={() => onHistorySelect(idx)}
                 />
               ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Settings Section */}
      <div className="flex-shrink-0 pt-3 border-t border-gray-700 mt-2">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <SettingsIcon className="w-5 h-5 mr-2" />
          <span className="text-sm font-medium">API 설정</span>
        </button>
      </div>

    </div>
  );
};

export default LeftPanel;
