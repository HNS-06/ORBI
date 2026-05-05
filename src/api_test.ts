import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_KEY = process.env.GEMINI_API_KEY || import.meta.env?.VITE_GEMINI_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || import.meta.env?.VITE_GROQ_API_KEY || "";

async function testGroq() {
  console.log("Testing Groq API...");
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Say 'Groq is Healthy'" }],
        max_tokens: 10
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Groq Success:", data.choices[0].message.content);
      return true;
    } else {
      console.log("❌ Groq Failed:", response.status, await response.text());
      return false;
    }
  } catch (e) {
    console.log("❌ Groq Error:", e);
    return false;
  }
}

async function testGemini() {
  console.log("Testing Gemini API...");
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Say 'Gemini is Healthy'");
    const text = result.response.text();
    console.log("✅ Gemini Success:", text);
    return true;
  } catch (e: any) {
    console.log("❌ Gemini Failed:", e.message);
    return false;
  }
}

async function runTests() {
  console.log("--- API HEALTH CHECK ---");
  const groqHealth = await testGroq();
  const geminiHealth = await testGemini();
  console.log("------------------------");
  console.log(`FINAL STATUS: ${groqHealth && geminiHealth ? "ALL SYSTEMS GO" : "PARTIAL DEGRADATION"}`);
}

runTests();
