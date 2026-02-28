"""
LLM service — Ollama wrapper for quiz generation, Socratic hints, and answer evaluation
"""
import json
import re
import ollama
from typing import Optional

MODEL_NAME = "mistral"  # Will use mistral:7b-instruct via Ollama


def _chat(system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
    """Send a chat request to the local Ollama model."""
    try:
        response = ollama.chat(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            options={"temperature": temperature}
        )
        return response["message"]["content"]
    except Exception as e:
        print(f"[LLM ERROR] {e}")
        return ""


def _extract_json(text: str) -> Optional[dict]:
    """Try to extract JSON from LLM response."""
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON in markdown code blocks
    json_match = re.search(r'```(?:json)?\s*\n?([\s\S]*?)\n?```', text)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find JSON array or object
    for pattern in [r'\[[\s\S]*\]', r'\{[\s\S]*\}']:
        match = re.search(pattern, text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

    return None


def generate_quiz(context: str, num_questions: int = 5, difficulty: str = "medium") -> list:
    """
    Generate quiz questions from a given context.
    Returns list of question dicts with: question_text, question_type, options, correct_answer, explanation, hints
    """
    system_prompt = """You are an expert educational quiz generator. Generate questions that test understanding, not just memorization.
Your output MUST be valid JSON — an array of question objects. No markdown, no explanation outside the JSON."""

    user_prompt = f"""Based on the following study material, generate exactly {num_questions} quiz questions at {difficulty} difficulty level.

STUDY MATERIAL:
{context}

Return ONLY a JSON array where each element has these exact fields:
{{
  "question_text": "The question",
  "question_type": "mcq" or "short_answer",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."] (only for mcq, null for short_answer),
  "correct_answer": "The correct answer text",
  "explanation": "Brief explanation of why this is correct",
  "hint_1": "A vague conceptual hint that points to the right topic area",
  "hint_2": "A more specific hint that narrows down the approach",
  "hint_3": "A near-complete explanation leaving only the final connection"
}}

Make {max(1, num_questions // 3)} questions short_answer type and the rest mcq.
Ensure hints follow the Socratic method — guide thinking, never reveal the answer.
Generate EXACTLY {num_questions} questions. Return ONLY valid JSON."""

    response = _chat(system_prompt, user_prompt, temperature=0.7)
    result = _extract_json(response)

    if result is None:
        # Fallback: generate a simple question
        return [{
            "question_text": "What is the main concept discussed in this material?",
            "question_type": "short_answer",
            "options": None,
            "correct_answer": "The main concept from the study material",
            "explanation": "This is a fallback question generated when the AI had trouble creating specific questions.",
            "hint_1": "Think about the primary topic covered.",
            "hint_2": "Focus on the key definitions or principles mentioned.",
            "hint_3": "Review the opening paragraphs for the central theme.",
        }]

    if isinstance(result, dict):
        # Sometimes LLM wraps in {"questions": [...]}
        if "questions" in result:
            return result["questions"]
        return [result]

    return result if isinstance(result, list) else [result]


def generate_hint(question_text: str, correct_answer: str, hint_level: int, context: str = "") -> str:
    """
    Generate a Socratic hint at the specified level (1-3).
    Level 1: Vague conceptual direction
    Level 2: More specific, narrows approach
    Level 3: Near-complete, leaves final step
    """
    level_descriptions = {
        1: "Give a VAGUE conceptual hint. Point to the general topic area without mentioning specific terms from the answer. Be encouraging.",
        2: "Give a MORE SPECIFIC hint. Narrow down the approach. You may reference related concepts but do NOT reveal the answer.",
        3: "Give a DETAILED hint that explains the reasoning step by step, leaving only the final conclusion for the student to make.",
    }

    system_prompt = "You are a Socratic tutor. Your job is to GUIDE students to discover answers themselves. NEVER reveal the answer directly. Be warm, encouraging, and concise (2-3 sentences max)."

    user_prompt = f"""Question: {question_text}
Correct answer (DO NOT reveal this): {correct_answer}

{level_descriptions.get(hint_level, level_descriptions[1])}

Respond with ONLY the hint text, nothing else."""

    return _chat(system_prompt, user_prompt, temperature=0.6)


def evaluate_answer(question_text: str, correct_answer: str, user_answer: str) -> dict:
    """
    Evaluate a user's answer with partial credit scoring.
    Returns {"is_correct": bool, "score": 0.0-1.0, "feedback": str}
    """
    system_prompt = """You are a fair exam grader. Evaluate the student's answer against the correct answer.
Consider partial credit for answers that show understanding even if not perfectly worded.
Return ONLY valid JSON."""

    user_prompt = f"""Question: {question_text}
Correct Answer: {correct_answer}
Student's Answer: {user_answer}

Return JSON with exactly these fields:
{{
  "is_correct": true/false (true if substantially correct),
  "score": 0.0 to 1.0 (partial credit),
  "feedback": "Brief encouraging feedback explaining what was right/wrong"
}}"""

    response = _chat(system_prompt, user_prompt, temperature=0.3)
    result = _extract_json(response)

    if result is None:
        # Fallback: simple string matching
        is_correct = correct_answer.lower().strip() in user_answer.lower().strip() or \
                     user_answer.lower().strip() in correct_answer.lower().strip()
        return {
            "is_correct": is_correct,
            "score": 1.0 if is_correct else 0.0,
            "feedback": "Correct! Great job!" if is_correct else f"Not quite. The correct answer is: {correct_answer}"
        }

    return result


def extract_topics(text: str) -> list:
    """
    Extract topic names from a text chunk using LLM.
    Returns a list of topic strings.
    """
    system_prompt = "You extract key topics from educational content. Return ONLY a JSON array of topic name strings."

    user_prompt = f"""From the following educational text, identify 3-7 distinct topics or subjects that are covered.
Return ONLY a JSON array of short topic names (2-5 words each).

TEXT:
{text[:2000]}"""

    response = _chat(system_prompt, user_prompt, temperature=0.3)
    result = _extract_json(response)

    if result and isinstance(result, list):
        return [str(t) for t in result[:7]]

    return ["General"]
