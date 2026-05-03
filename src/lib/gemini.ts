import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getAIClient() {
  if (!aiClient) {
    const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!rawKey) {
      throw new Error('GEMINI_API_KEY is not configured. Please add it in the settings.');
    }
    // Strip quotes if present (common issue in some environments)
    const apiKey = rawKey.replace(/^["']|["']$/g, '');
    
    if (apiKey === 'TODO' || apiKey.length < 10) {
      throw new Error('GEMINI_API_KEY is invalid or not set. Please provide a valid API key in the settings.');
    }

    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}
