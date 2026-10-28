from fastapi import APIRouter, HTTPException
from app.schemas import ReceiptParseRequest, ReceiptParseResponse
from app.services.receipt_vision import ReceiptVisionService

router = APIRouter(prefix="/ai/receipt", tags=["receipt"])


@router.post("/parse", response_model=ReceiptParseResponse)
async def parse_receipt(request: ReceiptParseRequest):
    """
    Parses a base64 receipt image into structured line items, merchant, tax, and tip.
    """
    try:
        return await ReceiptVisionService.parse_receipt(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
