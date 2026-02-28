"""
Quiz engine — SM-2 spaced repetition, XP/streak calculation, difficulty adaptation
"""
from datetime import datetime, timedelta
from typing import Optional


def calculate_sm2(
    quality: int,  # 0-5 rating (0=complete blackout, 5=perfect)
    ease_factor: float = 2.5,
    interval: int = 1,
    repetitions: int = 0
) -> dict:
    """
    SM-2 spaced repetition algorithm.
    Returns: {"ease_factor": float, "interval": int (days), "next_review": datetime}
    """
    if quality >= 3:
        # Correct response
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = int(interval * ease_factor)

        ease_factor = max(1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
        repetitions += 1
    else:
        # Incorrect — reset
        repetitions = 0
        interval = 1

    next_review = datetime.utcnow() + timedelta(days=interval)

    return {
        "ease_factor": round(ease_factor, 2),
        "interval": interval,
        "next_review": next_review,
        "repetitions": repetitions,
    }


def calculate_xp(
    is_correct: bool,
    hints_used: int = 0,
    difficulty: str = "medium",
    streak: int = 0
) -> dict:
    """
    Calculate XP earned for answering a question.
    Returns: {"xp_earned": int, "breakdown": dict}
    """
    # Base XP
    difficulty_multiplier = {"easy": 1.0, "medium": 1.5, "hard": 2.0}
    base_xp = 10

    if not is_correct:
        return {
            "xp_earned": 2,  # Participation XP
            "breakdown": {"base": 2, "reason": "Nice try! Keep learning!"}
        }

    # Correct answer bonuses
    multiplier = difficulty_multiplier.get(difficulty, 1.5)
    xp = int(base_xp * multiplier)

    # Hint penalty (but still positive)
    hint_penalty = hints_used * 2
    xp = max(5, xp - hint_penalty)

    # Streak bonus (caps at 50%)
    streak_bonus = min(streak * 0.05, 0.5)
    streak_xp = int(xp * streak_bonus)
    xp += streak_xp

    return {
        "xp_earned": xp,
        "breakdown": {
            "base": int(base_xp * multiplier),
            "hint_penalty": -hint_penalty,
            "streak_bonus": streak_xp,
            "difficulty": difficulty,
        }
    }


def get_level(xp: int) -> dict:
    """
    Calculate level from XP.
    Each level requires progressively more XP.
    Returns: {"level": int, "xp_for_current": int, "xp_for_next": int, "progress": float}
    """
    level = 1
    xp_remaining = xp
    xp_for_level = 100  # Level 1 needs 100 XP

    while xp_remaining >= xp_for_level:
        xp_remaining -= xp_for_level
        level += 1
        xp_for_level = int(xp_for_level * 1.3)  # 30% more each level

    return {
        "level": level,
        "xp_in_level": xp_remaining,
        "xp_for_next": xp_for_level,
        "progress": round(xp_remaining / xp_for_level, 2),
        "total_xp": xp,
    }


def update_streak(last_active: Optional[datetime]) -> dict:
    """
    Update study streak based on last active date.
    Returns: {"streak": int, "streak_maintained": bool}
    """
    now = datetime.utcnow()

    if last_active is None:
        return {"streak": 1, "streak_maintained": True}

    # Check if last active was today
    if last_active.date() == now.date():
        return {"streak": -1, "streak_maintained": True}  # -1 = no change needed

    # Check if last active was yesterday
    if last_active.date() == (now - timedelta(days=1)).date():
        return {"streak": 1, "streak_maintained": True}  # Increment by 1

    # Streak broken
    return {"streak": 1, "streak_maintained": False}  # Reset to 1


def get_adaptive_difficulty(mastery: float) -> str:
    """
    Determine quiz difficulty based on topic mastery.
    mastery: 0.0 to 1.0
    """
    if mastery < 0.3:
        return "easy"
    elif mastery < 0.7:
        return "medium"
    else:
        return "hard"
