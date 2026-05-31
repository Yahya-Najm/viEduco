import json

from openai import OpenAI

from core.config import settings

_client = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def generate_protocol(transcript: list[dict]) -> dict:
    transcript_text = "\n".join(
        f"[{seg['speaker']}] ({seg['start_time']:.1f}s - {seg['end_time']:.1f}s): {seg['text']}"
        for seg in transcript
    )

    response = _get_client().chat.completions.create(
        model="gpt-5-nano-2025-08-07",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a meeting protocol assistant. Given a transcript, return a JSON object with:\n"
                    '- "participants": list of speaker names/IDs present\n'
                    '- "discussion": list of {"speaker": str, "summary": str} covering the key points\n'
                    '- "decisions": list of decisions made during the meeting\n'
                    "Return only valid JSON, no markdown, no explanation."
                ),
            },
            {
                "role": "user",
                "content": f"Transcript:\n{transcript_text}",
            },
        ],
    )

    return json.loads(response.choices[0].message.content)
