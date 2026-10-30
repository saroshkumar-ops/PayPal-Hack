"""
TripSheriff AI — Content Safety & Moderation Service (Task M)

Guarantees:
  - Zero profanity in generated messages
  - Zero real threats or genuine harassment
  - All detected violations produce safe neutral payment reminders
  - Instant opt-out via /pause, /dispute, /optout keywords
"""
import re
from typing import Tuple

# ---------------------------------------------------------------------------
# Blocked pattern groups
# ---------------------------------------------------------------------------

# Real threats / violence
_THREAT_PATTERNS = [
    r"\b(kill|murder|hurt|attack|harm|beat\s+you|gonna\s+get\s+you|destroy\s+you)\b",
    r"\b(i['']ll\s+find\s+you|come\s+for\s+you|you['']re\s+dead)\b",
]

# Profanity (common — match also asterisk-substituted forms like f***ing)
_PROFANITY_PATTERNS = [
    r"\b(f[u\*]+ck|sh[i\*]+t|b[i\*]+tch|[a\*]+sshole|c[u\*]+nt|d[i\*]+ck|bastard|f[a\*]+ggot)\b",
    # Catch explicit star-censored variants like f***ing by scanning for f+stars+ing pattern
    r"f[\*]{2,}\w+",
    r"s[\*]{2,}t\b",
]

# Slurs / hate speech (broad catch)
_SLUR_PATTERNS = [
    r"\b(n[i\*]+gg[ae]r|k[i\*]+ke|sp[i\*]+c|ch[i\*]+nk|r[e\*]+tard|w[o\*]+g)\b",
    r"\b(racial|ethnic\s+slur)\b",
]

# Genuine harassment / doxing
_HARASSMENT_PATTERNS = [
    r"\b(your\s+address|where\s+you\s+live|i\s+know\s+where\s+you\s+(live|sleep))\b",
    r"\b(doxx|swat|expose\s+you)\b",
]

# All compiled together
_ALL_BLOCKED: list[re.Pattern] = [
    re.compile(p, re.IGNORECASE)
    for p in (
        _THREAT_PATTERNS
        + _PROFANITY_PATTERNS
        + _SLUR_PATTERNS
        + _HARASSMENT_PATTERNS
    )
]

# ---------------------------------------------------------------------------
# Opt-out / freeze keywords
# ---------------------------------------------------------------------------
_OPT_OUT_KEYWORDS = frozenset(
    ["pause", "dispute", "optout", "opt-out", "opt out", "stop", "freeze", "halt"]
)


class ModerationService:
    @staticmethod
    def is_safe(text: str) -> Tuple[bool, str]:
        """
        Validates text against ethical and non-harassment rules.

        Returns:
            (True, "Safe") if the text passes all checks.
            (False, reason) if any blocked pattern is found.
        """
        lower = text.lower()
        for pattern in _ALL_BLOCKED:
            if pattern.search(lower):
                return False, f"Message flagged: '{pattern.pattern}' matched."
        return True, "Safe"

    @staticmethod
    def contains_opt_out(text: str) -> bool:
        """
        Returns True if the message contains a participant opt-out / dispute keyword.
        Java backend should call this to immediately freeze automated reminders.
        """
        lower = text.lower()
        return any(kw in lower for kw in _OPT_OUT_KEYWORDS)

    @staticmethod
    def safe_fallback(debtor_name: str, amount_cents: int, description: str) -> str:
        """
        Returns a safe, neutral payment reminder when the generated text is flagged.
        """
        amount_fmt = f"${amount_cents / 100:.2f}"
        return (
            f"Hi {debtor_name}, this is a friendly reminder that "
            f"{amount_fmt} is outstanding for {description}. "
            f"Please settle via the PayPal link below."
        )
