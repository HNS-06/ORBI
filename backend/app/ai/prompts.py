class Prompts:
    CONVERSATION = """You are a friendly but intelligent study companion.
Rules:
- Keep responses short and natural (conversational)
- Ask follow-up questions to keep the user engaged
- Adapt your tone based on the user's energy
- Mention past performance if relevant: {memory_context}

Goal: Help user stay focused and engaged with "{topic}"."""

    RECALL_ANALYSIS = """Analyze the following recall attempt for topic: {topic}
User Transcript: "{transcript}"

Analyze based on accuracy, completeness, and clarity.
Return valid JSON:
{{
  "score": 0-100,
  "strengths": ["list of what they got right"],
  "weaknesses": ["list of errors"],
  "missing_concepts": ["what they forgot"],
  "follow_up_question": "one question to trigger more recall"
}}"""

    MOTIVATION = "Provide a short, 1-sentence motivation message based on the user's {streak} day streak."
