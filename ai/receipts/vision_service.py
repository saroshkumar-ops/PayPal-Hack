import io
import re
import json
import base64
import logging
from typing import Tuple, List, Optional
from PIL import Image

from core.schemas import ReceiptParseRequest, ReceiptParseResponse, ReceiptItem
from core.config import settings

logger = logging.getLogger(__name__)


RECEIPT_EXTRACTION_PROMPT = """
You are an expert financial receipt auditor and OCR extraction system for TripSheriff AI.
Analyze this receipt image and extract structured financial line items.

Rules:
1. Extract the merchant/vendor name accurately.
2. Extract the transaction date if legible (YYYY-MM-DD or readable string).
3. Extract each individual line item with:
   - "name": Clean item description (e.g., "Truffle Pasta", "Draft Beer")
   - "qty": Item count (integer >= 1)
   - "price_cents": Item price in INTEGER CENTS (e.g., $14.50 -> 1450, $4.00 -> 400).
4. Extract financial totals in INTEGER CENTS:
   - "subtotal_cents": Pre-tax subtotal
   - "tax_cents": Total sales tax / VAT
   - "tip_cents": Gratuity or tip (include handwritten tip if written on merchant copy, else 0)
   - "total_cents": Final bill total
5. Ensure the currency is parsed in the specified code.

You MUST respond strictly with a valid JSON object matching this schema:
{
  "merchant": "string",
  "date": "string or null",
  "items": [
    {"name": "string", "qty": 1, "price_cents": 1200}
  ],
  "subtotal_cents": 1200,
  "tax_cents": 100,
  "tip_cents": 200,
  "total_cents": 1500
}
"""


class ReceiptVisionService:
    @staticmethod
    def _clean_base64_payload(raw_base64: str) -> Tuple[bytes, str]:
        """
        Strips Data URI prefix (e.g. 'data:image/jpeg;base64,') and returns (raw_bytes, mime_type).
        """
        mime_type = "image/jpeg"
        if "," in raw_base64:
            header, encoded = raw_base64.split(",", 1)
            match = re.search(r"data:([^;]+);base64", header)
            if match:
                mime_type = match.group(1)
        else:
            encoded = raw_base64

        try:
            image_bytes = base64.b64decode(encoded)
        except Exception as e:
            raise ValueError(f"Invalid base64 payload: {str(e)}")

        return image_bytes, mime_type

    @staticmethod
    def _preprocess_image(image_bytes: bytes, max_dim: int = 2048) -> Tuple[bytes, str]:
        """
        Validates image bytes with PIL and resizes if dimensions exceed max_dim.
        """
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                img_format = img.format or "JPEG"
                mime = f"image/{img_format.lower()}"
                width, height = img.size

                if width > max_dim or height > max_dim:
                    img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
                    out_buffer = io.BytesIO()
                    img.save(out_buffer, format=img_format)
                    return out_buffer.getvalue(), mime

                return image_bytes, mime
        except Exception as e:
            raise ValueError(f"Corrupted or unreadable image file: {str(e)}")

    @staticmethod
    def _reconcile_receipt_math(data: dict) -> ReceiptParseResponse:
        """
        Validates and reconciles integer-cent arithmetic for extracted receipt data.
        """
        raw_items = data.get("items", [])
        items: List[ReceiptItem] = []

        computed_subtotal = 0
        for idx, item_data in enumerate(raw_items):
            qty = max(1, int(item_data.get("qty", 1)))
            price_cents = int(item_data.get("price_cents", 0))
            name = str(item_data.get("name", f"Item #{idx+1}")).strip()

            items.append(ReceiptItem(index=idx, name=name, qty=qty, price_cents=price_cents))
            computed_subtotal += (price_cents * qty)

        subtotal_cents = int(data.get("subtotal_cents", 0))
        tax_cents = int(data.get("tax_cents", 0))
        tip_cents = int(data.get("tip_cents", 0))
        total_cents = int(data.get("total_cents", 0))

        if subtotal_cents <= 0 or abs(computed_subtotal - subtotal_cents) <= 5:
            subtotal_cents = computed_subtotal

        expected_total = subtotal_cents + tax_cents + tip_cents
        if total_cents <= 0 or abs(expected_total - total_cents) <= 5:
            total_cents = expected_total

        merchant = str(data.get("merchant", "Restaurant / Vendor")).strip()
        date = data.get("date")

        total_fmt = f"${total_cents / 100:.2f}"
        suggested_reply = (
            f"🧾 Extracted receipt from **{merchant}** ({total_fmt}). "
            f"Found {len(items)} items. Tap buttons below to claim what you ordered!"
        )

        return ReceiptParseResponse(
            status="SUCCESS",
            merchant=merchant,
            date=date,
            subtotal_cents=subtotal_cents,
            tax_cents=tax_cents,
            tip_cents=tip_cents,
            total_cents=total_cents,
            items=items,
            suggested_reply=suggested_reply
        )

    @classmethod
    async def parse_image_bytes(cls, image_bytes: bytes, mime_type: str = "image/jpeg", currency: str = "USD") -> ReceiptParseResponse:
        """
        Processes raw image bytes through Gemini 2.0 Flash or Mock engine.
        """
        cleaned_bytes, resolved_mime = cls._preprocess_image(image_bytes)

        if settings.USE_MOCK_AI or not settings.GEMINI_API_KEY:
            logger.info("Parsing receipt in MOCK mode.")
            mock_data = {
                "merchant": "Sunset Beach Bistro",
                "date": "2026-10-26",
                "items": [
                    {"name": "Grilled Red Snapper", "qty": 1, "price_cents": 4500},
                    {"name": "Truffle Fries", "qty": 2, "price_cents": 2500},
                    {"name": "Tropical Cocktails", "qty": 3, "price_cents": 5000},
                ],
                "subtotal_cents": 12000,
                "tax_cents": 1200,
                "tip_cents": 2400,
                "total_cents": 15600
            }
            return cls._reconcile_receipt_math(mock_data)

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            image_part = types.Part.from_bytes(data=cleaned_bytes, mime_type=resolved_mime)

            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            )

            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=[image_part, RECEIPT_EXTRACTION_PROMPT],
                config=config
            )

            raw_text = response.text.strip()
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```(?:json)?\n", "", raw_text)
                raw_text = re.sub(r"\n```$", "", raw_text)

            parsed_json = json.loads(raw_text)
            return cls._reconcile_receipt_math(parsed_json)

        except Exception as e:
            logger.error(f"Gemini Receipt OCR failed: {str(e)}", exc_info=True)
            raise RuntimeError(f"Multimodal OCR processing failed: {str(e)}")

    @classmethod
    async def parse_receipt(cls, request: ReceiptParseRequest) -> ReceiptParseResponse:
        """
        Parses a base64 receipt image payload.
        """
        image_bytes, mime_type = cls._clean_base64_payload(request.image_base64)
        return await cls.parse_image_bytes(image_bytes, mime_type=mime_type, currency=request.currency)
