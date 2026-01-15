
import { GoogleGenAI, Type } from "@google/genai";
import { StoryAnalysis, Scene } from "../types";

// Note: API_KEY is handled by the environment
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeStory = async (storyText: string): Promise<StoryAnalysis> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analyze the following novel text and break it down into 5 distinct cinematic scenes. 
    For each scene, provide a descriptive name and a highly detailed VISUAL PROMPT in ENGLISH for a video generation AI (Veo).
    The visual prompt should describe lighting, camera angle, and style.
    
    Story Text: ${storyText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING, description: "Arabic description of the scene" },
                visualPrompt: { type: Type.STRING, description: "Detailed English prompt for video generation" }
              },
              required: ["description", "visualPrompt"]
            }
          }
        },
        required: ["title", "scenes"]
      }
    }
  });

  const result = JSON.parse(response.text || '{}');
  return {
    title: result.title || "قصة جديدة",
    scenes: (result.scenes || []).map((s: any, index: number) => ({
      ...s,
      id: `scene-${index}`,
      status: 'pending'
    }))
  };
};

export const generateSceneVideo = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("فشل في استخراج رابط الفيديو");

  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
