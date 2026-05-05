import os
import google.generativeai as genai
from app.ai.prompts import Prompts
import json
import re

# Provided Keys
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_KEY = os.getenv("GROQ_API_KEY", "")

class AIService:
    def __init__(self):
        genai.configure(api_key=GEMINI_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def get_chat_response(self, topic: str, user_text: str, history: list, memory_context: str = "") -> str:
        system_instr = Prompts.CONVERSATION.format(topic=topic, memory_context=memory_context)
        
        chat = self.model.start_chat(history=[
            {"role": "user" if h["role"] == "user" else "model", "parts": [h["text"]]}
            for h in history
        ])
        
        response = chat.send_message(user_text)
        return response.text

    async def analyze_recall(self, topic: str, transcript: str) -> dict:
        prompt = Prompts.RECALL_ANALYSIS.format(topic=topic, transcript=transcript)
        response = self.model.generate_content(prompt)
        
        # Extract JSON
        match = re.search(r'\{.*\}', response.text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"error": "Analysis failed"}

    async def get_checkin_message(self, topic: str, duration: int) -> str:
        prompt = f"The user has been studying {topic} for {duration} minutes. Give a 1-sentence supportive check-in."
        response = self.model.generate_content(prompt)
        return response.text
