import os
from openai import OpenAI
from elevenlabs import generate, save
from typing import BinaryIO
import httpx

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class VoiceService:
    @staticmethod
    async def transcribe_audio(audio_file: BinaryIO) -> str:
        """Transcribe audio using Whisper API."""
        transcript = client.audio.transcriptions.create(
            model="whisper-1", 
            file=audio_file
        )
        return transcript.text

    @staticmethod
    async def text_to_speech(text: str) -> bytes:
        """Convert text to speech using ElevenLabs."""
        # Using ElevenLabs SDK or direct API call
        audio = generate(
            text=text,
            voice=os.getenv("ELEVENLABS_VOICE_ID", "Bella"),
            model="eleven_monolingual_v1",
            api_key=os.getenv("ELEVENLABS_API_KEY")
        )
        return audio

    @staticmethod
    async def text_to_speech_stream(text: str):
        """Streaming version of TTS if needed."""
        # Implementation for real-time streaming
        pass
