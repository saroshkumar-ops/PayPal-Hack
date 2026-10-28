import io
import base64
from PIL import Image, ImageDraw


class RoastCardGenerator:
    @staticmethod
    def generate_wanted_card(debtor_name: str, amount_cents: int, description: str) -> str:
        """
        Generates a lightweight 'WANTED: DEADBEAT' image card as a base64 PNG string.
        """
        img = Image.new("RGB", (600, 360), color=(245, 238, 220))
        draw = ImageDraw.Draw(img)

        # Outer border
        draw.rectangle([(20, 20), (580, 340)], outline=(110, 38, 14), width=5)

        # Header
        draw.text((200, 40), "WANTED: DEADBEAT", fill=(180, 20, 20))
        draw.text((220, 80), f"Name: {debtor_name}", fill=(30, 30, 30))
        draw.text((180, 120), f"Debt: ${amount_cents / 100:.2f}", fill=(180, 20, 20))
        draw.text((160, 160), f"Offense: Unpaid {description}", fill=(50, 50, 50))
        draw.text((140, 240), "REWARD: Friendship Restored", fill=(110, 38, 14))

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode("utf-8")
