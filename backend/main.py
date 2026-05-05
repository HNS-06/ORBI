from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="StudyAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AI Configuration ---
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)

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

class SessionStart(BaseModel):
    user_id: str
    companion_id: str
    topic: str

# --- Prompts ---
CONVERSATION_SYSTEM = """You are a friendly but intelligent study companion.
Rules:
- Keep responses short and natural
- Ask follow-up questions
- Adapt tone based on user energy
Goal: Help user stay focused and engaged."""

RECALL_SYSTEM = """Analyze the following recall attempt for topic: {topic}
Transcript: "{transcript}"
Past Performance: {past_perf}

Analyze:
1. What concepts are correct?
2. What is missing?
3. What is unclear?

Return JSON:
{{
  "score": 0-100,
  "strengths": [],
  "weak_areas": [],
  "follow_up": "one question to trigger more recall"
}}"""

# --- Endpoints ---

@app.post("/session/start")
async def start_session(data: SessionStart):
    # Logic to initialize session in DB (PostgreSQL/Redis)
    return {"session_id": "temp_session_123", "status": "active"}

@app.post("/ai/chat")
async def ai_chat(data: UserMessage):
    if not GEMINI_KEY:
        raise HTTPException(status_code=500, detail="Gemini key not configured")
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Prepare context
        context = f"[COMPANION: {data.companion}] [TOPIC: {data.topic}]"
        if data.memory_context:
            context += f" [MEMORY: {data.memory_context}]"
            
        full_history = []
        for h in data.history:
            full_history.append({"role": "user" if h["role"] == "user" else "model", "parts": [h["text"]]})
            
        chat = model.start_chat(history=full_history)
        response = chat.send_message(f"{context}\n\n{data.text}")
        
        return {"response": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recall/analyze")
async def analyze_recall(data: RecallRequest):
    if not GEMINI_KEY:
        raise HTTPException(status_code=500, detail="Gemini key not configured")
        
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = RECALL_SYSTEM.format(
            topic=data.topic, 
            transcript=data.transcript, 
            past_perf=data.past_performance or "No prior history"
        )
        
        response = model.generate_content(prompt)
        import json
        import re
        text = response.text
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"error": "Failed to parse analysis"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Voice Pipeline Endpoints ---

from fastapi import UploadFile, File
import tempfile
from groq import Groq
from fastapi.responses import StreamingResponse
import edge_tts

# We need the Groq key for Whisper. The frontend has one, or we can use it from env.
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

@app.post("/voice/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribes an uploaded audio file using Groq Whisper API."""
    try:
        # Save temp file
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
        if not transcript:
            raise HTTPException(status_code=400, detail="Empty transcript")
            
        return {"transcript": transcript}
    except Exception as e:
        print("Transcription error:", e)
        raise HTTPException(status_code=500, detail=str(e))

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "en-US-ChristopherNeural"

@app.post("/voice/tts")
async def text_to_speech(data: TTSRequest):
    """Generates streaming audio from text using Microsoft Edge TTS."""
    async def audio_generator():
        communicate = edge_tts.Communicate(data.text, data.voice, rate="+5%")
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    return StreamingResponse(audio_generator(), media_type="audio/mpeg")

@app.get("/health")
async def health():
    return {"status": "ok"}
