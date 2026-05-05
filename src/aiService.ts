import { RecallAnalysis } from './types';

const BACKEND_URL = "http://localhost:8000";

export async function chatWithCompanion(
  systemPrompt: string,
  history: { role: 'user' | 'ai'; text: string }[],
  userMessage: string,
  memoryContext?: string
): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_URL}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: userMessage,
        companion: systemPrompt, // Passing systemPrompt as companion for now, or you can parse it
        topic: "General Study",
        history: history.map(h => ({ role: h.role === 'ai' ? 'ai' : 'user', text: h.text })),
        memory_context: memoryContext
      })
    });

    if (!response.ok) throw new Error(`Backend AI error: ${response.status}`);
    const data = await response.json();
    return data.response;
  } catch (err) {
    console.error("Chat error:", err);
    return "Connection to ORBI Intelligence lost. Please try again.";
  }
}

export async function analyzeRecall(
  topic: string,
  transcript: string
): Promise<RecallAnalysis> {
  try {
    const response = await fetch(`${BACKEND_URL}/recall/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, transcript })
    });

    if (!response.ok) throw new Error(`Backend Analysis error: ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error("Analysis error:", err);
    return {
      score: 0,
      strengths: [],
      gaps: ['Connection error'],
      tips: ['Please check your internet and try again.'],
      keywords: [],
      summary: 'Failed to connect to analysis service.'
    };
  }
}

export async function getAICheckin(companionName: string, topic: string, elapsed: number): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_URL}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `The user has been studying ${topic} for ${elapsed} minutes. Give a 1-sentence supportive check-in.`,
        companion: companionName,
        topic: topic,
        history: []
      })
    });
    const data = await response.json();
    return data.response;
  } catch {
    return "Keep going, you're doing great!";
  }
}
