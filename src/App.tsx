
import React, { useState, useCallback, useEffect } from 'react';
import LeftPanel from './components/LeftPanel';
import CenterPanel from './components/CenterPanel';
import RightPanel from './components/RightPanel';
import { Tool, HistoryStep } from './types';
import { generateVisual, upscaleImage } from './services/geminiService';
import { base64ToFile, addWatermark } from './utils/imageUtils';
import { DownloadIcon, KeyIcon } from './components/icons';

const App: React.FC = () => {
  const [history, setHistory] = useState<HistoryStep[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);
  
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  
  const [itemReferenceImage, setItemReferenceImage] = useState<File | null>(null);
  
  const [activeTool, setActiveTool] = useState<Tool>(Tool.MASK);
  const [prompt, setPrompt] = useState<string>('');
  const [mask, setMask] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [showResetDialog, setShowResetDialog] = useState<boolean>(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState<boolean>(false);
  
  const [apiKey, setApiKey] = useState<string>('');

  // Security constants
  const API_KEY_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  // Initialize
  useEffect(() => {
    // 1. Load API Key
    const storedKey = localStorage.getItem('gemini_api_key');
    const storedTimestamp = localStorage.getItem('gemini_api_key_timestamp');

    if (storedKey && storedTimestamp) {
        const elapsed = Date.now() - parseInt(storedTimestamp, 10);
        if (elapsed > API_KEY_EXPIRY) {
            localStorage.removeItem('gemini_api_key');
            localStorage.removeItem('gemini_api_key_timestamp');
            setApiKey('');
        } else {
            setApiKey(storedKey);
        }
    } else {
        if (storedKey && !storedTimestamp) {
             localStorage.removeItem('gemini_api_key');
        }
    }
  }, [API_KEY_EXPIRY]);

  // --- Settings Logic ---

  const handleOpenSettings = () => {
      setShowSettingsDialog(true);
  };

  const handleSaveApiKey = () => {
      const trimmedKey = apiKey.trim();
      if (!trimmedKey) {
          setError("API 키를 입력해주세요.");
          return;
      }
      
      // Enhanced Validation
      if (!trimmedKey.startsWith('AIzaSy')) {
          setError("유효하지 않은 API 키 형식입니다. 'AIzaSy'로 시작하는 키를 입력해주세요.");
          return;
      }
      if (trimmedKey.length < 39) {
          setError("API 키 형식이 올바르지 않습니다. (길이 오류)");
          return;
      }
      
      localStorage.setItem('gemini_api_key', trimmedKey);
      localStorage.setItem('gemini_api_key_timestamp', Date.now().toString());
      
      setShowSettingsDialog(false);
      setError(null);
  };

  // --- Image Logic ---

  const handleImageUpload = (file: File) => {
    setOriginalImage(file);
    setHistory([{ file, prompt: '' }]);
    setCurrentHistoryIndex(0);
    setEditedImage(null);
    setActiveTool(Tool.MASK);
    setError(null);
    setPrompt('');
    
    setItemReferenceImage(null);
  };

  const handleGenerate = useCallback(async () => {
    if (!originalImage || !prompt) {
      setError("이미지를 업로드하고 프롬프트를 입력해주세요.");
      return;
    }

    if (!apiKey) {
        handleOpenSettings();
        setError("API 키가 필요합니다. 설정에서 키를 입력해주세요.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setEditedImage(null);

    try {
      const fullPrompt = `For the given architectural photo, ${prompt}. Maintain realism, proper lighting, and perspective.`;
      
      const resultBase64 = await generateVisual({
        imageFile: originalImage,
        prompt: fullPrompt,
        itemReferenceImage: itemReferenceImage,
        maskDataUrl: mask,
        apiKey: apiKey
      });
      
      const rawDataUrl = `data:image/png;base64,${resultBase64}`;
      const watermarkedDataUrl = await addWatermark(rawDataUrl, "EDIT BY. HANDOL 최인영");
      
      setEditedImage(watermarkedDataUrl);
      
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "이미지 생성 중 알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, prompt, itemReferenceImage, mask, apiKey]);

  const handleUpscale = useCallback(async (resolution: '2K' | '4K') => {
      const sourceImage = editedImage || originalImage;
      if (!sourceImage) {
          setError("업스케일할 이미지가 없습니다.");
          return;
      }

      if (!apiKey) {
          handleOpenSettings();
          setError("업스케일링을 위해서는 API 키가 필요합니다. 설정에서 키를 입력해주세요.");
          return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
          const upscalePrompt = prompt ? `${prompt}. High resolution, ${resolution} highly detailed.` : undefined;

          const resultBase64 = await upscaleImage({
              image: sourceImage instanceof File ? sourceImage : sourceImage,
              prompt: upscalePrompt,
              resolution,
              apiKey: apiKey
          });

          const rawDataUrl = `data:image/png;base64,${resultBase64}`;
          const watermarkedDataUrl = await addWatermark(rawDataUrl, "EDIT BY. HANDOL 최인영");
          
          setEditedImage(watermarkedDataUrl);

      } catch (err) {
           console.error(err);
           if (err instanceof Error && err.message.includes("Requested entity was not found")) {
                setError("API 키에 권한이 없거나 프로젝트를 찾을 수 없습니다. 유효한 유료 계정 API 키인지 확인해주세요.");
           } else {
                setError(err instanceof Error ? err.message : "업스케일 중 오류가 발생했습니다.");
           }
      } finally {
          setIsLoading(false);
      }

  }, [editedImage, originalImage, prompt, apiKey]);

  const handleDownload = useCallback(() => {
    const imageToDownload = editedImage || (originalImage ? URL.createObjectURL(originalImage) : null);
    
    if (!imageToDownload) return;

    const link = document.createElement('a');
    link.href = imageToDownload;
    link.download = 'arch-handol-result.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [editedImage, originalImage]);

  const handleApplyChanges = useCallback(async () => {
    if (!editedImage) return;
    
    try {
        const fileName = `step-${currentHistoryIndex + 1}.png`;
        const file = await base64ToFile(editedImage, fileName);
        
        const newStep: HistoryStep = { file, prompt: prompt };
        const newHistory = [...history.slice(0, currentHistoryIndex + 1), newStep];
        
        setHistory(newHistory);
        setCurrentHistoryIndex(newHistory.length - 1);
        setOriginalImage(file);
        
        setEditedImage(null);
        setPrompt(""); 
        setMask(null);
    } catch (err) {
        console.error("Failed to apply changes:", err);
        setError("이미지를 적용하는 중 오류가 발생했습니다.");
    }
  }, [editedImage, history, currentHistoryIndex, prompt]);

  const handleHistorySelect = useCallback((index: number) => {
    if (index < 0 || index >= history.length) return;
    
    const step = history[index];
    setOriginalImage(step.file);
    setCurrentHistoryIndex(index);
    setPrompt(step.prompt);
    
    setEditedImage(null);
    setMask(null);
    setError(null);
  }, [history]);

  const handleDiscardResult = useCallback(() => {
    setEditedImage(null);
  }, []);

  const resetState = useCallback(() => {
    setHistory([]);
    setCurrentHistoryIndex(-1);
    setOriginalImage(null);
    setEditedImage(null);
    setItemReferenceImage(null);
    setActiveTool(Tool.MASK);
    setPrompt('');
    setMask(null);
    setError(null);
    setIsLoading(false);
    setShowResetDialog(false);
  }, []);

  const handleStartOverClick = useCallback(() => {
      if (!originalImage && history.length === 0) {
          resetState();
          return;
      }
      setShowResetDialog(true);
  }, [originalImage, history.length, resetState]);

  const handleDownloadAll = useCallback(async () => {
    for (let i = 0; i < history.length; i++) {
        const step = history[i];
        const link = document.createElement('a');
        link.href = URL.createObjectURL(step.file);
        
        const fileName = i === 0 
            ? 'arch-handol-00-original.png' 
            : `arch-handol-step-${i.toString().padStart(2, '0')}.png`;
            
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        await new Promise(resolve => setTimeout(resolve, 400));
    }

    if (editedImage) {
        const link = document.createElement('a');
        link.href = editedImage;
        link.download = 'arch-handol-latest-edit.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  }, [history, editedImage]);

  const handleConfirmReset = useCallback(async (save: boolean) => {
      if (save) {
          await handleDownloadAll();
      }
      setTimeout(() => {
          resetState();
      }, 1000);
  }, [handleDownloadAll, resetState]);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-900 text-gray-100">
      <header className="bg-gray-800 border-b border-gray-700 p-4 shadow-md flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-wider text-white uppercase">ARCH-HANDOL</h1>
            <span className="text-xs md:text-base text-gray-400 font-medium">(주)한돌건축사사무소 최인영건축사</span>
        </div>
      </header>
      
      {/* 
          Mobile: Flex Col, Scrollable naturally
          Desktop: Grid, Fixed Height (overflow hidden on main)
          Order Logic for Mobile: Center (Image) -> Left (Tools) -> Right (Prompt)
      */}
      <main className="flex-grow flex flex-col md:grid md:grid-cols-[260px_1fr_320px] lg:grid-cols-[300px_1fr_360px] gap-4 p-4 md:overflow-hidden relative">
        
        {/* Left Panel: Tools & History */}
        <div className="order-2 md:order-1 h-auto md:h-full">
            <LeftPanel
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            onGenerate={handleGenerate}
            isLoading={isLoading}
            onDownload={handleDownload}
            showDownload={!!editedImage || !!originalImage}
            onApply={handleApplyChanges}
            history={history}
            currentHistoryIndex={currentHistoryIndex}
            onHistorySelect={handleHistorySelect}
            onUpscale={handleUpscale}
            onReset={handleStartOverClick}
            onOpenSettings={handleOpenSettings}
            />
        </div>

        {/* Center Panel: Image Canvas */}
        <div className="order-1 md:order-2 min-h-[50vh] md:min-h-0 h-auto md:h-full flex flex-col">
            <CenterPanel
            originalImage={originalImage}
            editedImage={editedImage}
            onImageUpload={handleImageUpload}
            activeTool={activeTool}
            onMaskChange={setMask}
            mask={mask}
            isLoading={isLoading}
            error={error}
            onDiscard={handleDiscardResult}
            />
        </div>

        {/* Right Panel: Prompt & Reference */}
        <div className="order-3 md:order-3 h-auto md:h-full pb-8 md:pb-0">
            <RightPanel
            prompt={prompt}
            setPrompt={setPrompt}
            itemReferenceImage={itemReferenceImage}
            setItemReferenceImage={setItemReferenceImage}
            />
        </div>

        {/* Reset Confirmation Dialog */}
        {showResetDialog && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-white mb-2">새로운 작업 시작</h3>
              <p className="text-gray-300 mb-6">
                지금까지의 모든 작업을 저장하시겠습니까?<br/>
                <span className="text-sm text-gray-400">저장 시 원본부터 단계별 이미지가 모두 다운로드됩니다.</span>
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleConfirmReset(true)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <DownloadIcon className="w-5 h-5" />
                  모두 저장하고 시작하기
                </button>
                <button
                  onClick={() => handleConfirmReset(false)}
                  className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-medium transition-colors"
                >
                  저장하지 않고 시작하기
                </button>
                <button
                  onClick={() => setShowResetDialog(false)}
                  className="w-full py-2 text-gray-500 hover:text-gray-400 text-sm mt-2"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Dialog */}
        {showSettingsDialog && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 text-indigo-400">
                            <KeyIcon className="w-7 h-7" />
                            <h3 className="text-xl font-bold text-white">설정</h3>
                        </div>
                    </div>
                    
                    <p className="text-gray-300 mb-4 text-sm">
                        앱 사용을 위한 API Key를 설정합니다. Key는 브라우저에만 저장됩니다.
                    </p>
                    
                    {/* API Key Section */}
                    <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <label className="block text-xs text-gray-400 uppercase mb-2 font-bold">Google Gemini API Key</label>
                        <input 
                            type="password" 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm"
                        />
                        <div className="mt-2 text-right">
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 underline">
                                API 키 발급받기
                            </a>
                        </div>
                    </div>

                    {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                    <div className="flex gap-2">
                         <button
                            onClick={handleSaveApiKey}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors"
                        >
                            저장
                        </button>
                        <button
                            onClick={() => { setShowSettingsDialog(false); setError(null); }}
                            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
