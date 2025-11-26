
export const fileToBase64 = (file: File): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [mimePart, dataPart] = result.split(',');
      if (!mimePart || !dataPart) {
        return reject(new Error("잘못된 데이터 URL 형식입니다."));
      }
      
      const mimeTypeMatch = mimePart.match(/:(.*?);/);
      if (!mimeTypeMatch || !mimeTypeMatch[1]) {
        return reject(new Error("데이터 URL에서 MIME 유형을 추출할 수 없습니다."));
      }

      const mimeType = mimeTypeMatch[1];
      resolve({ mimeType, data: dataPart });
    };
    reader.onerror = (error) => reject(error);
  });
};

export const base64ToFile = async (base64Data: string, fileName: string): Promise<File> => {
  const res = await fetch(base64Data);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type });
};

export const addWatermark = (dataUrl: string, text: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Canvas context not found"));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Configure watermark text
      // Dynamic font size: roughly 2.5% of image height, min 20px
      const fontSize = Math.max(20, Math.floor(img.height * 0.025));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; // White with slight transparency
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      
      // Add shadow for better visibility on any background
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Padding from bottom-right corner
      const paddingX = Math.max(20, img.width * 0.03);
      const paddingY = Math.max(20, img.height * 0.03);

      ctx.fillText(text, img.width - paddingX, img.height - paddingY);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(err);
  });
};
