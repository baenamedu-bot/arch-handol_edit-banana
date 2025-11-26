
import { GoogleGenAI, Modality } from "@google/genai";
import { fileToBase64 } from "../utils/imageUtils";

// Helper to initialize client dynamically
// Removed process.env.API_KEY dependency
const getGenAI = (apiKey: string) => {
    if (!apiKey) {
        throw new Error("API Key가 제공되지 않았습니다. 설정에서 API Key를 입력해주세요.");
    }
    return new GoogleGenAI({ apiKey });
};

interface GenerateOptions {
  imageFile: File;
  prompt: string;
  itemReferenceImage?: File | null;
  maskDataUrl?: string | null;
  apiKey: string; // Make apiKey mandatory
}

export async function generateVisual({ imageFile, prompt, itemReferenceImage, maskDataUrl, apiKey }: GenerateOptions): Promise<string> {
    try {
        const ai = getGenAI(apiKey);
        
        const { mimeType: mainMimeType, data: mainBase64Data } = await fileToBase64(imageFile);
        
        const parts: any[] = [
            {
                inlineData: {
                    data: mainBase64Data,
                    mimeType: mainMimeType,
                },
            }
        ];

        let systemInstructions = "";

        // 1. Handle Mask
        if (maskDataUrl) {
            const maskBase64 = maskDataUrl.split(',')[1]; 
            if (maskBase64) {
                parts.push({
                    inlineData: {
                        data: maskBase64,
                        mimeType: 'image/png',
                    }
                });
                systemInstructions += " \n\n[MASK INSTRUCTION]: The second image provided above is a MASK (transparent with pink strokes). \n1. The pink brush strokes define the EDIT REGION. \n2. Keep all areas NOT covered by pink strokes EXACTLY as they are in the original image. \n3. Only generate new content matching the prompt/reference inside the pink masked area. \n4. Blend the edges naturally.";
            }
        }

        // 2. Handle Item Reference
        if (itemReferenceImage) {
            const { mimeType: itemMime, data: itemData } = await fileToBase64(itemReferenceImage);
            parts.push({
                inlineData: {
                    data: itemData,
                    mimeType: itemMime,
                }
            });
            // This refers to the image just added
            systemInstructions += " \n\n[ITEM REFERENCE]: The image provided just now is an ITEM REFERENCE. Use the object/furniture/structure shown in this image as the visual target for the prompt. \n- If a mask is provided, place a variation of this item inside the masked area, matching the perspective of the main scene. \n- If no mask is provided, integrate this item into the scene appropriately.";
        }

        // Combine User Prompt with System Instructions
        const finalPrompt = `${prompt} \n${systemInstructions}`;

        // Add text prompt last
        parts.push({ text: finalPrompt });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: parts,
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        return handleResponse(response);

    } catch (error: any) {
        console.error("Error calling Gemini API:", error);
        const errorMessage = error.message || "알 수 없는 오류";
        throw new Error(`${errorMessage}`);
    }
}

interface UpscaleOptions {
    image: File | string; // Can be file or base64 data url
    prompt?: string;
    resolution: '2K' | '4K';
    apiKey: string; // Make apiKey mandatory
}

export async function upscaleImage({ image, prompt, resolution, apiKey }: UpscaleOptions): Promise<string> {
    try {
        // Re-initialize client to ensure we capture the latest API key
        const aiClient = getGenAI(apiKey);
        
        let imageData: string;
        let mimeType: string = 'image/png';

        if (image instanceof File) {
            const result = await fileToBase64(image);
            imageData = result.data;
            mimeType = result.mimeType;
        } else {
            // Assume Data URL
            const parts = image.split(',');
            if (parts.length === 2) {
                imageData = parts[1];
                const match = parts[0].match(/:(.*?);/);
                if (match) mimeType = match[1];
            } else {
                imageData = image; // Assume raw base64 if no header, though unlikely in this app flow
            }
        }

        const parts: any[] = [
            {
                inlineData: {
                    data: imageData,
                    mimeType: mimeType,
                },
            },
            {
                text: prompt || "High resolution, highly detailed architectural photography, 8k, photorealistic. Enhance details, textures, and lighting while maintaining the original composition and geometry.",
            }
        ];

        const response = await aiClient.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: parts,
            },
            config: {
                imageConfig: {
                    imageSize: resolution, // "2K" or "4K"
                },
            },
        });

        return handleResponse(response);
        
    } catch (error: any) {
        console.error("Error calling Gemini API for Upscale:", error);
        const errorMessage = error.message || "알 수 없는 오류";
        throw new Error(`${errorMessage}`);
    }
}

function handleResponse(response: any): string {
    if (!response.candidates || response.candidates.length === 0) {
         throw new Error("AI 모델에서 응답이 없습니다. (No candidates returned)");
    }

    const candidate = response.candidates[0];

    if (candidate.finishReason === 'SAFETY') {
        throw new Error("안전 정책 위반(Safety Filter)으로 인해 이미지가 생성되지 않았습니다.");
    }

    if (!candidate.content || !candidate.content.parts) {
         throw new Error(`생성된 콘텐츠가 없습니다. (Reason: ${candidate.finishReason})`);
    }

    for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
        if (part.text) {
            throw new Error(`이미지 생성 거부: ${part.text}`);
        }
    }
    
    throw new Error("응답에 이미지 데이터가 포함되지 않았습니다.");
}
