from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import os
import tempfile
import google.generativeai as genai
from groq import Groq
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import json
import re

load_dotenv()

app = FastAPI(title="ORBI AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AI Configuration & Verification ---
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
GROQ_KEY = os.getenv("GROQ_API_KEY")

print("--- AI SERVICE INITIALIZATION ---")
print(f"GEMINI_KEY LOADED: {'YES (ID: ' + (GEMINI_KEY[:5] if GEMINI_KEY else '') + '...)' if GEMINI_KEY else 'NO'}")
print(f"GROQ_KEY LOADED:   {'YES (ID: ' + (GROQ_KEY[:5] if GROQ_KEY else '') + '...)' if GROQ_KEY else 'NO'}")
print("---------------------------------")

if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)

groq_client = Groq(api_key=GROQ_KEY) if GROQ_KEY else None

# --- Models ---
class UserMessage(BaseModel):
    text: str
    companion: str
    topic: str
    history: List[dict]
    memory_context: Optional[str] = None

class RecallRequest(BaseModel):
    topic: str
    transcript: str
    past_performance: Optional[str] = None

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "en-US-ChristopherNeural"

# --- Endpoints ---

@app.post("/ai/chat")
async def ai_chat(data: UserMessage):
    """Unified chat endpoint using Groq with Gemini fallback."""
    if not GROQ_KEY and not GEMINI_KEY:
        raise HTTPException(status_code=500, detail="AI keys not configured")
    
    system_prompt = f"You are a friendly but intelligent study companion. COMPANION: {data.companion}. TOPIC: {data.topic}."
    if data.memory_context:
        system_prompt += f" MEMORY: {data.memory_context}"

    # Try Groq First
    if GROQ_KEY:
        try:
            print(f"[AI] Attempting Groq Chat for topic: {data.topic}")
            messages = [{"role": "system", "content": system_prompt}]
            for h in data.history:
                messages.append({"role": "assistant" if h["role"] == "ai" else "user", "content": h["text"]})
            messages.append({"role": "user", "content": data.text})

            chat_completion = groq_client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
                temperature=0.7,
                max_tokens=500
            )
            return {"response": chat_completion.choices[0].message.content}
        except Exception as e:
            print(f"[AI] Groq Error: {e}")
            if not GEMINI_KEY:
                raise HTTPException(status_code=500, detail=f"Groq failed: {str(e)}")

    # Fallback to Gemini
    try:
        print(f"[AI] Falling back to Gemini for topic: {data.topic}")
        model = genai.GenerativeModel('gemini-1.5-flash')
        full_history = []
        for h in data.history:
            full_history.append({"role": "user" if h["role"] == "user" else "model", "parts": [h["text"]]})
            
        chat = model.start_chat(history=full_history)
        response = chat.send_message(f"{system_prompt}\n\n{data.text}")
        return {"response": response.text}
    except Exception as e:
        print(f"[AI] Gemini Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribes an uploaded audio file using Groq Whisper API."""
    if not GROQ_KEY:
        raise HTTPException(status_code=500, detail="Groq key not configured for transcription")
        
    try:
        print(f"[VOICE] Receiving audio: {file.filename}")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            content = await file.read()
            temp_audio.write(content)
            temp_audio_path = temp_audio.name

        with open(temp_audio_path, "rb") as f:
            transcription = groq_client.audio.transcriptions.create(
                file=(file.filename, f.read()),
                model="whisper-large-v3-turbo",
                response_format="json",
                language="en"
            )
        
        os.remove(temp_audio_path)
        transcript = transcription.text.strip()
        print(f"[VOICE] Transcription result: {transcript}")
        return {"transcript": transcript}
    except Exception as e:
        print(f"[VOICE] Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recall/analyze")
async def analyze_recall(data: RecallRequest):
    """Analyzes a recall attempt using AI."""
    if not GROQ_KEY and not GEMINI_KEY:
        raise HTTPException(status_code=500, detail="AI keys not configured")
        
    prompt = f"Analyze this recall attempt for topic: {data.topic}. Transcript: \"{data.transcript}\". Past Performance: {data.past_performance or 'None'}. Return ONLY valid JSON: {{\"score\": 0-100, \"strengths\": [], \"gaps\": [], \"tips\": [], \"keywords\": [], \"summary\": \"\"}}"

    try:
        if GROQ_KEY:
            res = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"}
            )
            return json.loads(res.choices[0].message.content)
        
        # Gemini fallback
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        match = re.search(r'\{.*\}', response.text, re.DOTALL)
        return json.loads(match.group()) if match else {"error": "Failed to parse analysis"}
    except Exception as e:
        print(f"[AI] Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/tts")
async def text_to_speech(data: TTSRequest):
    """Generates streaming audio from text using Microsoft Edge TTS."""
    import edge_tts
    from fastapi.responses import StreamingResponse
    
    async def audio_generator():
        communicate = edge_tts.Communicate(data.text, data.voice, rate="+5%")
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]
 
    return StreamingResponse(audio_generator(), media_type="audio/mpeg")

@app.get("/test-ai")
async def test_ai():
    """Test AI connectivity with a simple prompt."""
    try:
        data = UserMessage(
            text="Hello, this is a test.",
            companion="TestBot",
            topic="Testing",
            history=[]
        )
        response = await ai_chat(data)
        return {"status": "success", "response": response["response"]}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@app.get("/health")
async def health():
    return {"status": "ok", "groq": bool(GROQ_KEY), "gemini": bool(GEMINI_KEY)}
