import { GoogleGenerativeAI } from '@google/generative-ai';
import { RecallAnalysis } from './types';

// Provided Keys
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// Primary: Groq (using Llama 3 for speed and reliability)
async function chatWithGroq(systemPrompt: string, history: any[], userMessage: string): Promise<string> {
  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(h => ({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.text })),
      { role: "user", content: userMessage }
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) {
    console.error("Groq chat error:", err);
    throw err; // Let fallback handle it
  }
}

export async function chatWithCompanion(
  systemPrompt: string,
  history: { role: 'user' | 'ai'; text: string }[],
  userMessage: string,
  memoryContext?: string
): Promise<string> {
  const fullSystemPrompt = memoryContext 
    ? `${systemPrompt}\n\n[HISTORICAL CONTEXT: ${memoryContext}]`
    : systemPrompt;

  try {
    // PRIMARY: GROQ
    return await chatWithGroq(fullSystemPrompt, history, userMessage);
  } catch (groqErr) {
    console.log("Groq failed, falling back to Gemini...");
    try {
      // FALLBACK: GEMINI
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent({
        contents: [
          ...history.map(m => ({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        systemInstruction: fullSystemPrompt
      });
      return result.response.text();
    } catch (geminiErr) {
      console.error("All AI providers failed.");
      return "Network signal lost. Please check connection.";
    }
  }
}

export async function analyzeRecall(
  topic: string,
  transcript: string
): Promise<RecallAnalysis> {
  // Use Groq for faster analysis too
  try {
    const prompt = `Analyze this recall attempt for "${topic}": "${transcript}". 
Return ONLY valid JSON: {"score": 0-100, "strengths": [], "gaps": [], "tips": [], "keywords": [], "summary": ""}`;
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    return {
      score: 50,
      strengths: ['Partial attempt'],
      gaps: ['Analysis failed'],
      tips: ['Try again'],
      keywords: [],
      summary: 'Connection error during analysis.'
    };
  }
}

export async function getAICheckin(companionName: string, topic: string, elapsed: number): Promise<string> {
  try {
    return await chatWithGroq(`You are ${companionName}.`, [], `The user has been studying ${topic} for ${elapsed} minutes. Give a 1-sentence supportive check-in.`);
  } catch {
    return "Keep going, you're doing great.";
  }
}
