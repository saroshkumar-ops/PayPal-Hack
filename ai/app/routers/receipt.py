from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
from app.schemas import (
    ReceiptParseRequest,
    ReceiptParseResponse,
    ItemizerSplitRequest,
    ItemizerSplitResponse
)
from app.services.receipt_vision import ReceiptVisionService
from app.services.receipt_itemizer import ReceiptItemizerService

router = APIRouter(prefix="/ai/receipt", tags=["receipt"])


@router.post("/parse", response_model=ReceiptParseResponse)
async def parse_receipt_base64(request: ReceiptParseRequest):
    """
    Contract 1.2: Parses a base64 encoded receipt image into structured line items, merchant, tax, and tip.
    """
    try:
        return await ReceiptVisionService.parse_receipt(request)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload", response_model=ReceiptParseResponse)
async def upload_and_parse_receipt(
    file: UploadFile = File(...),
    currency: str = Form("USD")
):
    """
    Convenience endpoint for testing receipt photos directly via file upload (PNG/JPEG/WEBP).
    """
    try:
        content_bytes = await file.read()
        mime_type = file.content_type or "image/jpeg"
        return await ReceiptVisionService.parse_image_bytes(content_bytes, mime_type=mime_type, currency=currency)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/split", response_model=ItemizerSplitResponse)
async def calculate_itemized_split(request: ItemizerSplitRequest):
    """
    Calculates fair individual member split shares from claimed receipt items,
    allocating tax and tip proportionally with zero integer rounding drift.
    """
    try:
        return ReceiptItemizerService.calculate_split(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
