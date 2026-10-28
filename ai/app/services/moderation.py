import re
from typing import Tuple

BLOCKED_PATTERNS = [
    r"\b(hate|kill|murder|violence|threat)\b",
    r"\b(racial|slur)\b"
]


class ModerationService:
    @staticmethod
    def is_safe(text: str) -> Tuple[bool, str]:
        """
        Validates text against ethical and non-harassment rules.
        """
        lower = text.lower()
        for pattern in BLOCKED_PATTERNS:
            if re.search(pattern, lower):
                return False, "Message flagged by safety guardrails."
        return True, "Safe"
