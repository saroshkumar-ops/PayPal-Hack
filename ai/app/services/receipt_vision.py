from typing import Optional
from app.schemas import ReceiptParseRequest, ReceiptParseResponse, ReceiptItem
from app.config import settings


class ReceiptVisionService:
    @staticmethod
    async def parse_receipt(request: ReceiptParseRequest) -> ReceiptParseResponse:
        """
        Parses receipt image into structured integer-cent JSON.
        Default baseline implementation with mock fallback.
        """
        if settings.USE_MOCK_AI or not settings.GEMINI_API_KEY:
            return ReceiptParseResponse(
                status="SUCCESS",
                merchant="Sunset Beach Bistro",
                date="2026-10-26",
                subtotal_cents=12000,
                tax_cents=1200,
                tip_cents=2400,
                total_cents=15600,
                items=[
                    ReceiptItem(name="Grilled Red Snapper", qty=1, price_cents=4500),
                    ReceiptItem(name="Truffle Fries", qty=2, price_cents=2500),
                    ReceiptItem(name="Tropical Cocktails", qty=3, price_cents=5000),
                ],
                suggested_reply="🧾 Extracted receipt from **Sunset Beach Bistro** ($156.00). Tap items below to claim what you ordered!"
            )
        
        # Real Gemini multimodal logic is built in Task G branch
        raise NotImplementedError("Live Gemini Vision OCR is implemented in Task G branch.")
