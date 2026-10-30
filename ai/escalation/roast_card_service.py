"""
TripSheriff AI — "WANTED: DEADBEAT" Dynamic Meme Card Generator (Task F)

Generates a stylised Western-themed bounty poster as a base64 PNG string.
Uses only Pillow (no external fonts required) — gracefully upgrades to
a richer layout if a TTF font is found in the system.
"""
from __future__ import annotations

import io
import base64
import logging
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Colour palette
# ---------------------------------------------------------------------------
_BG_CREAM        = (245, 238, 215)
_BORDER_BROWN    = (110,  38,  14)
_RED_WANTED      = (180,  20,  20)
_TEXT_DARK       = ( 30,  30,  30)
_SUBTEXT         = ( 80,  50,  20)
_GOLD_ACCENT     = (212, 160,  23)
_SHERIFF_BADGE   = (184, 140,  10)

# ---------------------------------------------------------------------------
# Font helpers
# ---------------------------------------------------------------------------

def _try_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Attempt to load a system TTF font; fall back to Pillow default."""
    candidates = [
        "arialbd.ttf" if bold else "arial.ttf",
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
        "LiberationSans-Bold.ttf" if bold else "LiberationSans-Regular.ttf",
        "FreeSansBold.ttf" if bold else "FreeSans.ttf",
    ]
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except (IOError, OSError):
            continue
    return ImageFont.load_default()


# ---------------------------------------------------------------------------
# Badge / icon helpers
# ---------------------------------------------------------------------------

def _draw_sheriff_badge(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int) -> None:
    """Draw a simple 5-pointed star outline as a sheriff badge."""
    import math
    points: list[tuple[float, float]] = []
    for i in range(10):
        angle = math.radians(-90 + i * 36)
        radius = r if i % 2 == 0 else r * 0.45
        points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    draw.polygon(points, fill=_SHERIFF_BADGE, outline=_BORDER_BROWN)


def _draw_paypal_badge(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int) -> None:
    """Draw a simple PayPal-branded CTA button."""
    draw.rounded_rectangle([x, y, x + w, y + h], radius=8, fill=(0, 70, 127))
    font = _try_font(14, bold=True)
    label = "PAY via PayPal  →"
    draw.text((x + w // 2, y + h // 2), label, fill=(255, 255, 255), font=font, anchor="mm")


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

class RoastCardGenerator:

    @staticmethod
    def generate_wanted_card(
        debtor_name: str,
        amount_cents: int,
        description: str,
        debtor_handle: Optional[str] = None,
        creditor_name: Optional[str] = None,
    ) -> str:
        """
        Generates a stylised "WANTED: DEADBEAT" bounty poster.

        Returns:
            Base64-encoded PNG string (no Data URI prefix).
        """
        W, H = 640, 480
        img = Image.new("RGB", (W, H), color=_BG_CREAM)
        draw = ImageDraw.Draw(img)

        # ── Outer parchment border ────────────────────────────────────────
        draw.rectangle([(8, 8), (W - 8, H - 8)], outline=_BORDER_BROWN, width=6)
        draw.rectangle([(14, 14), (W - 14, H - 14)], outline=_BORDER_BROWN, width=2)

        # ── Corner ornament squares ───────────────────────────────────────
        for cx, cy in [(20, 20), (W - 20, 20), (20, H - 20), (W - 20, H - 20)]:
            draw.rectangle([(cx - 6, cy - 6), (cx + 6, cy + 6)], fill=_GOLD_ACCENT)

        # ── Sheriff badge ─────────────────────────────────────────────────
        _draw_sheriff_badge(draw, W // 2, 48, 26)

        # ── WANTED header ─────────────────────────────────────────────────
        font_wanted = _try_font(52, bold=True)
        draw.text((W // 2, 90), "WANTED", fill=_RED_WANTED, font=font_wanted, anchor="mm")

        # ── Sub-header ────────────────────────────────────────────────────
        font_sub = _try_font(16, bold=False)
        draw.text((W // 2, 122), "DEADBEAT  ·  TRIP TREASURER'S NIGHTMARE", fill=_SUBTEXT, font=font_sub, anchor="mm")

        # ── Divider ───────────────────────────────────────────────────────
        draw.line([(40, 136), (W - 40, 136)], fill=_BORDER_BROWN, width=2)

        # ── Silhouette "mugshot" placeholder ─────────────────────────────
        mug_x, mug_y, mug_w, mug_h = W // 2 - 50, 148, 100, 110
        draw.rectangle([mug_x, mug_y, mug_x + mug_w, mug_y + mug_h], fill=(200, 190, 170), outline=_BORDER_BROWN, width=2)
        # Head
        draw.ellipse([mug_x + 28, mug_y + 8, mug_x + 72, mug_y + 58], fill=(180, 160, 130), outline=_BORDER_BROWN)
        # Body
        draw.rectangle([mug_x + 20, mug_y + 56, mug_x + 80, mug_y + mug_h], fill=(120, 80, 50))
        # Label strip
        draw.rectangle([mug_x, mug_y + mug_h, mug_x + mug_w, mug_y + mug_h + 18], fill=_BORDER_BROWN)
        draw.text((mug_x + mug_w // 2, mug_y + mug_h + 9), "SUSPECT", fill=_BG_CREAM, font=_try_font(11, bold=True), anchor="mm")

        # ── Name ─────────────────────────────────────────────────────────
        font_name = _try_font(30, bold=True)
        display_name = debtor_handle or debtor_name
        draw.text((W // 2, 285), display_name, fill=_TEXT_DARK, font=font_name, anchor="mm")

        # ── Amount / bounty ───────────────────────────────────────────────
        amount_str = f"BOUNTY:  ${amount_cents / 100:,.2f}"
        font_bounty = _try_font(22, bold=True)
        draw.text((W // 2, 318), amount_str, fill=_RED_WANTED, font=font_bounty, anchor="mm")

        # ── Crime ─────────────────────────────────────────────────────────
        font_crime = _try_font(14, bold=False)
        crime_text = f"CRIME: Unpaid \"{description[:36]}\""
        draw.text((W // 2, 344), crime_text, fill=_SUBTEXT, font=font_crime, anchor="mm")

        if creditor_name:
            victim_text = f"VICTIM: {creditor_name} (still waiting)"
            draw.text((W // 2, 364), victim_text, fill=_SUBTEXT, font=font_crime, anchor="mm")

        # ── Divider ───────────────────────────────────────────────────────
        draw.line([(40, 384), (W - 40, 384)], fill=_BORDER_BROWN, width=2)

        # ── Reward strip ─────────────────────────────────────────────────
        font_reward = _try_font(13, bold=False)
        draw.text(
            (W // 2, 398),
            "REWARD: Friendship Restored  ·  PayPal Confirmation Screenshot",
            fill=_BORDER_BROWN, font=font_reward, anchor="mm"
        )

        # ── PayPal CTA button ─────────────────────────────────────────────
        _draw_paypal_badge(draw, W // 2 - 100, 416, 200, 34)

        # ── Footer watermark ─────────────────────────────────────────────
        font_footer = _try_font(10, bold=False)
        draw.text(
            (W // 2, H - 14),
            "TripSheriff AI  ·  Saving Friendships, One Debt at a Time",
            fill=_SUBTEXT, font=font_footer, anchor="mm"
        )

        # ── Encode ───────────────────────────────────────────────────────
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
