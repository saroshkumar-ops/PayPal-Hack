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
   - "name": Clean item description (e.g., "MALAI CHAP GRAVY", "Truffle Pasta")
   - "quantity": Item count as an integer >= 1 (from QTY column)
   - "unit_price_cents": Unit rate or single-item price in INTEGER CENTS / paise (from RATE or unit price column).
   - "line_total_cents": Total line amount in INTEGER CENTS / paise (from AMOUNT, TOTAL, or line price column, equal to quantity x unit_price_cents).
   NOTE: If the receipt only has a single price column, use that value for both unit_price_cents and line_total_cents (with quantity: 1).
   NOTE: If the image is a payment confirmation screenshot, UPI slip, banking app screenshot, or lump-sum receipt WITHOUT itemized lines, create a single item representing the full charge with the merchant or transaction remarks (e.g., "Swiggy Limited - Pay for Intent", quantity: 1, unit_price_cents: total_cents, line_total_cents: total_cents).
5. Extract financial totals in INTEGER CENTS (paise / cents):
   - "subtotal_cents": Pre-tax subtotal (printed on the receipt, e.g. SUB_TOT)
   - "tax_cents": Total sales tax / VAT / GST (0 if none)
   - "tip_cents": Gratuity or tip (0 if none)
   - "round_off_cents": Round-off adjustment in integer cents if printed (e.g. +24 paise or -10 paise; positive if rounded up, negative if rounded down, 0 if none)
   - "total_cents": Final bill/payment total (e.g. BL.TOT, CASH, GRAND TOTAL)

You MUST respond strictly with a valid JSON object matching this schema:
{
  "merchant": "string",
  "date": "string or null",
  "currency": "USD",
  "currency_symbol": "$",
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "unit_price_cents": 1200,
      "line_total_cents": 1200
    }
  ],
  "subtotal_cents": 1200,
  "tax_cents": 0,
  "tip_cents": 0,
  "round_off_cents": 0,
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
            qty = max(1, int(item_data.get("quantity") or item_data.get("qty", 1)))

            raw_unit = item_data.get("unit_price_cents")
            raw_line = item_data.get("line_total_cents")
            raw_price = item_data.get("price_cents")

            # Determine line_total_cents and unit_price_cents
            if raw_line is not None and int(raw_line) > 0:
                line_total_cents = int(raw_line)
                unit_price_cents = int(raw_unit) if raw_unit is not None else round(line_total_cents / qty)
            elif raw_unit is not None and int(raw_unit) > 0:
                unit_price_cents = int(raw_unit)
                line_total_cents = unit_price_cents * qty
            elif raw_price is not None and int(raw_price) > 0:
                # If only legacy price_cents was returned:
                # Check if price_cents is unit rate (when qty > 1 and printed subtotal matches price_cents * qty)
                val = int(raw_price)
                if qty > 1 and subtotal_cents > 0 and abs(val * qty - subtotal_cents) <= 10:
                    unit_price_cents = val
                    line_total_cents = val * qty
                else:
                    line_total_cents = val
                    unit_price_cents = round(val / qty)
            else:
                unit_price_cents = 0
                line_total_cents = 0

            name = str(item_data.get("name", f"Item #{idx+1}")).strip()

            items.append(ReceiptItem(
                index=idx,
                name=name,
                qty=qty,
                quantity=qty,
                unit_price_cents=unit_price_cents,
                line_total_cents=line_total_cents,
                price_cents=line_total_cents
            ))
            computed_subtotal += line_total_cents

        # Fallback for single lump-sum payments / UPI receipts without itemized breakdown
        if len(items) == 0 and total_cents > 0:
            fallback_name = f"{merchant} (Lump-sum Payment)"
            items.append(ReceiptItem(
                index=0,
                name=fallback_name,
                qty=1,
                quantity=1,
                unit_price_cents=total_cents,
                line_total_cents=total_cents,
                price_cents=total_cents
            ))
            computed_subtotal = total_cents

        printed_subtotal_cents = subtotal_cents if subtotal_cents > 0 else None
        round_off_cents = int(data.get("round_off_cents", 0))

        # Check for subtotal mismatch
        subtotal_mismatch = False
        if printed_subtotal_cents is not None and printed_subtotal_cents > 0:
            if abs(computed_subtotal - printed_subtotal_cents) > 5:
                subtotal_mismatch = True

        # Auto-detect round-off if not explicitly extracted
        if round_off_cents == 0 and total_cents > 0:
            expected_total = (printed_subtotal_cents or computed_subtotal) + tax_cents + tip_cents
            diff = total_cents - expected_total
            if 0 < abs(diff) <= 100:
                round_off_cents = diff

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
            subtotal_cents=printed_subtotal_cents if (printed_subtotal_cents and not subtotal_mismatch) else computed_subtotal,
            printed_subtotal_cents=printed_subtotal_cents,
            round_off_cents=round_off_cents,
            subtotal_mismatch=subtotal_mismatch,
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
        from groq import AsyncGroq

        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        base64_img = base64.b64encode(cleaned_bytes).decode("utf-8")
        data_url = f"data:{resolved_mime};base64,{base64_img}"

        completion = await client.chat.completions.create(
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
                    {"name": "Grilled Red Snapper", "quantity": 1, "unit_price_cents": 4500, "line_total_cents": 4500},
                    {"name": "Truffle Fries", "quantity": 2, "unit_price_cents": 1250, "line_total_cents": 2500},
                    {"name": "Tropical Cocktails", "quantity": 3, "unit_price_cents": 1667, "line_total_cents": 5000},
                ],
                "subtotal_cents": 12000,
                "tax_cents": 1200,
                "tip_cents": 2400,
                "round_off_cents": 0,
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
