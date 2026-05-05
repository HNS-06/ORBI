from fastapi import APIRouter, UploadFile, File, Form, Depends
from fastapi.responses import StreamingResponse
from app.services.voice_service import VoiceService
from app.services.ai_service import AIService
from io import BytesIO
import json

router = APIRouter(prefix="/ai", tags=["ai"])
voice_service = VoiceService()
ai_service = AIService()

@router.post("/voice-chat")
async def voice_chat(
    audio: UploadFile = File(...),
    topic: str = Form(...),
    history_json: str = Form("[]"),
    memory_context: str = Form("")
):
    """Voice-in, Voice-out chat pipeline."""
    # 1. Transcribe
    audio_content = await audio.read()
    transcript = await voice_service.transcribe_audio(BytesIO(audio_content))
    
    # 2. Get AI Response
    history = json.loads(history_json)
    ai_text = await ai_service.get_chat_response(topic, transcript, history, memory_context)
    
    # 3. Text to Speech
    audio_response = await voice_service.text_to_speech(ai_text)
    
    # Return audio and text (text in headers or separate endpoint, but streaming audio is priority)
    return StreamingResponse(
        BytesIO(audio_response), 
        media_type="audio/mpeg",
        headers={"X-AI-Response-Text": ai_text, "X-User-Transcript": transcript}
    )

@router.post("/analyze-recall")
async def analyze_recall(
    topic: str = Form(...),
    audio: UploadFile = File(...)
):
    """Perform recall analysis on voice input."""
    audio_content = await audio.read()
    transcript = await voice_service.transcribe_audio(BytesIO(audio_content))
    
    analysis = await ai_service.analyze_recall(topic, transcript)
    return {**analysis, "transcript": transcript}
