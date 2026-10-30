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

CURRENCY_SYMBOLS = {
    "USD": "$",
    "INR": "₹",
    "EUR": "€",
    "GBP": "£",
    "JPY": "¥",
    "CAD": "$",
    "AUD": "$",
    "SGD": "$",
    "CHF": "CHF ",
    "AED": "AED ",
}

RECEIPT_EXTRACTION_PROMPT = """
You are an expert financial receipt auditor and OCR extraction system for TripSheriff AI.
Analyze this receipt image and extract structured financial line items.

Rules:
1. Extract the merchant/vendor name accurately (e.g., from header, banking name, or business title).
2. Extract the transaction date if legible (YYYY-MM-DD or readable string).
3. Detect the currency ISO code (e.g., "INR", "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "SGD") and currency symbol ("₹", "$", "€", "£", "¥") from the image. For example, if the amount has '₹' or mentions UPI/India banks/paise, the currency is "INR" and symbol is "₹". If '$', "USD". If '€', "EUR". If not clearly visible, default to the requested currency.
4. Extract each individual line item with:
   - "name": Clean item description (e.g., "Truffle Pasta", "Draft Beer")
   - "qty": Item count (integer >= 1)
   - "price_cents": Item price in INTEGER CENTS (or lowest currency unit, e.g. paise / cents)
   NOTE: If the image is a payment confirmation screenshot, UPI slip, banking app screenshot, or lump-sum receipt WITHOUT itemized lines, create a single item representing the full charge with the merchant or transaction remarks (e.g., "Swiggy Limited - Pay for Intent", qty: 1, price_cents: total_cents).
5. Extract financial totals in INTEGER CENTS (paise / cents):
   - "subtotal_cents": Pre-tax subtotal
   - "tax_cents": Total sales tax / VAT (0 if none)
   - "tip_cents": Gratuity or tip (0 if none)
   - "total_cents": Final bill/payment total

You MUST respond strictly with a valid JSON object matching this schema:
{
  "merchant": "string",
  "date": "string or null",
  "currency": "USD",
  "currency_symbol": "$",
  "items": [
    {"name": "string", "qty": 1, "price_cents": 1200}
  ],
  "subtotal_cents": 1200,
  "tax_cents": 0,
  "tip_cents": 0,
  "total_cents": 1200
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

    @classmethod
    def _reconcile_receipt_math(cls, data: dict, requested_currency: str = "USD") -> ReceiptParseResponse:
        """
        Validates and reconciles integer-cent arithmetic for extracted receipt data.
        """
        # Resolve currency and symbol
        detected_curr = str(data.get("currency") or "").strip().upper()
        currency = detected_curr if detected_curr else (requested_currency or "USD").upper().strip()

        detected_sym = str(data.get("currency_symbol") or "").strip()
        currency_symbol = detected_sym if detected_sym else CURRENCY_SYMBOLS.get(currency, "$")

        merchant = str(data.get("merchant", "Restaurant / Vendor")).strip()
        date = data.get("date")

        subtotal_cents = int(data.get("subtotal_cents", 0))
        tax_cents = int(data.get("tax_cents", 0))
        tip_cents = int(data.get("tip_cents", 0))
        total_cents = int(data.get("total_cents", 0))

        raw_items = data.get("items", [])
        items: List[ReceiptItem] = []
        computed_subtotal = 0

        for idx, item_data in enumerate(raw_items):
            qty = max(1, int(item_data.get("qty", 1)))
            price_cents = int(item_data.get("price_cents", 0))
            name = str(item_data.get("name", f"Item #{idx+1}")).strip()

            items.append(ReceiptItem(index=idx, name=name, qty=qty, price_cents=price_cents))
            computed_subtotal += (price_cents * qty)

        # Fallback for single lump-sum payments / UPI receipts without itemized breakdown
        if len(items) == 0 and total_cents > 0:
            fallback_name = f"{merchant} (Lump-sum Payment)"
            items.append(ReceiptItem(index=0, name=fallback_name, qty=1, price_cents=total_cents))
            computed_subtotal = total_cents

        if subtotal_cents <= 0 or abs(computed_subtotal - subtotal_cents) <= 5:
            subtotal_cents = computed_subtotal

        expected_total = subtotal_cents + tax_cents + tip_cents
        if total_cents <= 0 or abs(expected_total - total_cents) <= 5:
            total_cents = expected_total

        total_fmt = f"{currency_symbol}{total_cents / 100:.2f}"
        if len(items) == 1 and any(term in items[0].name.lower() for term in ["payment", "pay for intent", "lump-sum", "transfer"]):
            suggested_reply = (
                f"🧾 Extracted payment receipt from **{merchant}** ({total_fmt}). "
                f"Detected single charge. Tap to claim or split with group!"
            )
        else:
            suggested_reply = (
                f"🧾 Extracted receipt from **{merchant}** ({total_fmt}). "
                f"Found {len(items)} items. Tap buttons below to claim what you ordered!"
            )

        return ReceiptParseResponse(
            status="SUCCESS",
            merchant=merchant,
            date=date,
            currency=currency,
            currency_symbol=currency_symbol,
            subtotal_cents=subtotal_cents,
            tax_cents=tax_cents,
            tip_cents=tip_cents,
            total_cents=total_cents,
            items=items,
            suggested_reply=suggested_reply
        )

    @classmethod
    async def _call_gemini_vision(cls, cleaned_bytes: bytes, resolved_mime: str, currency: str = "USD") -> ReceiptParseResponse:
        """
        Calls Google Gemini Vision with automatic model fallback.
        """
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        image_part = types.Part.from_bytes(data=cleaned_bytes, mime_type=resolved_mime)

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
        )

        models_to_try = [
            settings.GEMINI_MODEL,
            "gemini-3.5-flash",
            "gemini-3-flash-preview",
            "gemini-flash-latest"
        ]

        last_error = None
        for model_id in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_id,
                    contents=[image_part, RECEIPT_EXTRACTION_PROMPT],
                    config=config
                )

                raw_text = response.text.strip()
                if raw_text.startswith("```"):
                    raw_text = re.sub(r"^```(?:json)?\n", "", raw_text)
                    raw_text = re.sub(r"\n```$", "", raw_text)

                parsed_json = json.loads(raw_text)
                return cls._reconcile_receipt_math(parsed_json, requested_currency=currency)
            except Exception as e:
                logger.warning(f"Model {model_id} failed: {str(e)}; trying next fallback...")
                last_error = e

        raise RuntimeError(f"All Gemini vision models failed. Last error: {str(last_error)}")

    @classmethod
    async def _call_groq_vision(cls, cleaned_bytes: bytes, resolved_mime: str, currency: str = "USD") -> ReceiptParseResponse:
        """
        Calls Groq's Vision endpoint if available.
        """
        from groq import Groq

        client = Groq(api_key=settings.GROQ_API_KEY)
        base64_str = base64.b64encode(cleaned_bytes).decode("utf-8")
        data_url = f"data:{resolved_mime};base64,{base64_str}"

        completion = client.chat.completions.create(
            model=settings.GROQ_VISION_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": RECEIPT_EXTRACTION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url},
                    },
                ],
            }],
            response_format={"type": "json_object"},
            temperature=0.1,
        )

        raw_text = completion.choices[0].message.content.strip()
        if raw_text.startswith("```"):
            raw_text = re.sub(r"^```(?:json)?\n", "", raw_text)
            raw_text = re.sub(r"\n```$", "", raw_text)

        parsed_json = json.loads(raw_text)
        return cls._reconcile_receipt_math(parsed_json, requested_currency=currency)

    @classmethod
    async def parse_image_bytes(cls, image_bytes: bytes, mime_type: str = "image/jpeg", currency: str = "USD") -> ReceiptParseResponse:
        """
        Processes raw image bytes through Gemini Vision, Groq Vision, or Mock engine.
        """
        cleaned_bytes, resolved_mime = cls._preprocess_image(image_bytes)

        # 1. Check for Mock Mode
        if settings.USE_MOCK_AI or (not settings.GEMINI_API_KEY and not settings.GROQ_API_KEY):
            logger.info("Parsing receipt in MOCK mode.")
            mock_data = {
                "merchant": "Sunset Beach Bistro",
                "date": "2026-10-26",
                "currency": currency,
                "currency_symbol": CURRENCY_SYMBOLS.get(currency.upper(), "$"),
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
            return cls._reconcile_receipt_math(mock_data, requested_currency=currency)

        # 2. Primary: Gemini Vision (tested and active with fallback)
        if settings.GEMINI_API_KEY:
            try:
                return await cls._call_gemini_vision(cleaned_bytes, resolved_mime, currency=currency)
            except Exception as e:
                logger.error(f"Gemini Receipt OCR failed: {str(e)}", exc_info=True)
                if not settings.GROQ_API_KEY:
                    raise RuntimeError(f"Gemini OCR processing failed: {str(e)}")

        # 3. Secondary: Groq Vision
        if settings.GROQ_API_KEY:
            try:
                return await cls._call_groq_vision(cleaned_bytes, resolved_mime, currency=currency)
            except Exception as e:
                logger.error(f"Groq Vision OCR failed: {str(e)}", exc_info=True)
                raise RuntimeError(f"Vision OCR processing failed: {str(e)}")

        raise RuntimeError("No valid AI provider configured.")

    @classmethod
    async def parse_receipt(cls, request: ReceiptParseRequest) -> ReceiptParseResponse:
        """
        Parses a base64 receipt image payload.
        """
        image_bytes, mime_type = cls._clean_base64_payload(request.image_base64)
        return await cls.parse_image_bytes(image_bytes, mime_type=mime_type, currency=request.currency)
