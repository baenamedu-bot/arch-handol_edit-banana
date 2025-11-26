
import React, { useRef } from 'react';
import { UploadIcon, TrashIcon } from './icons';

interface RightPanelProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  itemReferenceImage: File | null;
  setItemReferenceImage: (file: File | null) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ 
  prompt, 
  setPrompt,
  itemReferenceImage,
  setItemReferenceImage
}) => {
  const itemInputRef = useRef<HTMLInputElement>(null);
  
  const handleItemFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setItemReferenceImage(e.target.files[0]);
    }
  };

  const handleClearItemRef = () => {
    setItemReferenceImage(null);
    if (itemInputRef.current) itemInputRef.current.value = '';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col shadow-xl gap-4 h-full overflow-y-auto custom-scrollbar">
      
      {/* Prompt Section */}
      <div className="flex-shrink-0">
        <h2 className="text-lg font-semibold mb-2 text-white">프롬프트</h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="원하는 변경 사항을 설명하세요... 예: '건물을 미래 공상 과학 영화에 나오는 것처럼 보이게 만들어주세요'"
          className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none text-sm"
        />
      </div>

      {/* Item Reference Image Section */}
      <div className="flex-shrink-0">
        <h2 className="text-base font-semibold mb-1 text-white">아이템 레퍼런스 (객체)</h2>
        <p className="text-xs text-gray-400 mb-2">
          마스킹된 영역에 넣거나, 장면에 추가할 특정 객체의 형태를 참고할 이미지를 업로드하세요.
        </p>
        
        {!itemReferenceImage ? (
          <div 
            onClick={() => itemInputRef.current?.click()}
            className="border-2 border-dashed border-gray-600 hover:border-indigo-500 bg-gray-900 hover:bg-gray-800 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition-colors h-24"
          >
            <UploadIcon className="w-6 h-6 text-gray-500 mb-1" />
            <span className="text-xs text-gray-400">아이템 이미지 업로드</span>
            <input 
              type="file" 
              ref={itemInputRef} 
              onChange={handleItemFileChange} 
              className="hidden" 
              accept="image/*"
            />
          </div>
        ) : (
          <div className="relative bg-gray-900 rounded-lg p-2 border border-gray-700">
            <img 
              src={URL.createObjectURL(itemReferenceImage)} 
              alt="Item Reference" 
              className="w-full h-24 object-contain rounded-md" 
            />
            <button 
              onClick={handleClearItemRef}
              className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-md transition-colors"
              title="삭제"
            >
              <TrashIcon className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default RightPanel;
