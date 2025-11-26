
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Tool } from '../types';
import ImageComparisonSlider from './ImageComparisonSlider';
import { UploadIcon, CloseIcon, EraserIcon } from './icons';

interface CenterPanelProps {
  originalImage: File | null;
  editedImage: string | null;
  onImageUpload: (file: File) => void;
  activeTool: Tool;
  onMaskChange: (maskDataUrl: string | null) => void;
  mask: string | null;
  isLoading: boolean;
  error: string | null;
  onDiscard?: () => void;
}

const CenterPanel: React.FC<CenterPanelProps> = ({
  originalImage,
  editedImage,
  onImageUpload,
  activeTool,
  onMaskChange,
  mask,
  isLoading,
  error,
  onDiscard,
}) => {
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onImageUpload(acceptedFiles[0]);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
    multiple: false,
  });

  const drawImage = useCallback(() => {
    const imageCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const container = containerRef.current;
    if (!imageCanvas || !maskCanvas || !container || !originalImage) return;

    const ctx = imageCanvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = URL.createObjectURL(originalImage);
    img.onload = () => {
      const containerAspect = container.clientWidth / container.clientHeight;
      const imgAspect = img.width / img.height;
      
      let drawWidth, drawHeight;

      if (imgAspect > containerAspect) {
        drawWidth = container.clientWidth;
        drawHeight = drawWidth / imgAspect;
      } else {
        drawHeight = container.clientHeight;
        drawWidth = drawHeight * imgAspect;
      }

      imageCanvas.width = drawWidth;
      imageCanvas.height = drawHeight;
      maskCanvas.width = drawWidth;
      maskCanvas.height = drawHeight;
      
      ctx.drawImage(img, 0, 0, drawWidth, drawHeight);

      // Draw mask if it exists (Restore mask state)
      if (mask) {
        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) {
          const maskImg = new Image();
          maskImg.src = mask;
          maskImg.onload = () => {
            maskCtx.drawImage(maskImg, 0, 0, drawWidth, drawHeight);
          };
        }
      }
    };
  }, [originalImage, mask]);

  useEffect(() => {
    // Only draw if we are NOT in editing mode (slider mode)
    if (!editedImage) {
        drawImage();
        const handleResize = () => drawImage();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }
  }, [originalImage, editedImage, drawImage]);
  
  // Mouse Coordinates
  const getCoords = (e: React.MouseEvent): { x: number; y: number } | null => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Touch Coordinates
  const getTouchCoords = (e: React.TouchEvent): { x: number; y: number } | null => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool !== Tool.MASK) return;
    
    let coords;
    if ('touches' in e) {
       coords = getTouchCoords(e as React.TouchEvent);
    } else {
       coords = getCoords(e as React.MouseEvent);
    }
    
    if (!coords) return;
    
    const ctx = maskCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || activeTool !== Tool.MASK) return;
    
    let coords;
    if ('touches' in e) {
       coords = getTouchCoords(e as React.TouchEvent);
    } else {
       coords = getCoords(e as React.MouseEvent);
    }

    if (!coords) return;
    
    const ctx = maskCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.7)';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };
  
  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const maskDataUrl = maskCanvasRef.current?.toDataURL();
    onMaskChange(maskDataUrl || null);
  };

  const renderContent = () => {
    if (editedImage) {
      return (
        <div className="relative w-full h-full">
            <ImageComparisonSlider
              beforeImage={URL.createObjectURL(originalImage!)}
              afterImage={editedImage}
            />
            {onDiscard && (
                <button
                    onClick={onDiscard}
                    className="absolute top-4 right-4 bg-gray-900/80 hover:bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm backdrop-blur-sm border border-gray-600 transition-all"
                >
                    <CloseIcon className="w-4 h-4" />
                    <span>재편집 (결과 닫기)</span>
                </button>
            )}
        </div>
      );
    }

    if (originalImage) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <canvas ref={imageCanvasRef} />
          <canvas
            ref={maskCanvasRef}
            className={`absolute top-0 left-0 ${activeTool === Tool.MASK ? 'cursor-crosshair' : 'cursor-default'} touch-none`}
            style={{ touchAction: 'none' }} // Critical for mobile to prevent scrolling while drawing
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
           {/* Clear Mask Button */}
           {mask && !isLoading && (
             <button
                onClick={() => onMaskChange(null)}
                className="absolute top-4 right-4 bg-gray-900/80 hover:bg-red-900/80 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm backdrop-blur-sm border border-gray-600 transition-all z-10"
             >
                <EraserIcon className="w-4 h-4" />
                <span>마스크 지우기</span>
             </button>
           )}

           {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-20">
                <div className="w-16 h-16 border-4 border-t-transparent border-indigo-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-lg font-semibold">AI가 이미지를 생성하고 있습니다...</p>
              </div>
            )}
        </div>
      );
    }
    
    return (
      <div {...getRootProps()} className={`w-full h-full min-h-[300px] md:min-h-0 border-4 border-dashed rounded-xl flex items-center justify-center text-center transition-colors duration-300 ${isDragActive ? 'border-indigo-500 bg-gray-700' : 'border-gray-600 hover:border-gray-500'}`}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center text-gray-400 p-4">
            <UploadIcon className="w-16 h-16 mb-4" />
            <h3 className="text-xl md:text-2xl font-bold">이미지를 업로드하세요</h3>
            <p className="mt-2 text-sm md:text-base">클릭하여 선택하거나 드래그 앤 드롭</p>
        </div>
      </div>
    );
  };
  
  return (
    <div ref={containerRef} className="bg-gray-800/50 rounded-lg flex flex-col items-center justify-center shadow-inner overflow-hidden relative w-full h-full min-h-[400px] md:min-h-0">
      {error && <div className="absolute top-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg z-30 shadow-lg">{error}</div>}
      {renderContent()}
    </div>
  );
};

export default CenterPanel;
