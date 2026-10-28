import io
import base64
import pytest
from PIL import Image
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas import (
    ReceiptParseResponse,
    ReceiptItem,
    ItemizerSplitRequest
)
from app.services.receipt_itemizer import ReceiptItemizerService


def create_dummy_png_base64() -> str:
    """Helper to generate a valid minimal 100x100 white PNG in base64."""
    img = Image.new("RGB", (100, 100), color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


@pytest.mark.asyncio
async def test_parse_receipt_base64_mock():
    png_b64 = create_dummy_png_base64()
    payload = {
        "trip_id": "trip_bali_2026",
        "image_base64": f"data:image/png;base64,{png_b64}",
        "currency": "USD"
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/ai/receipt/parse", json=payload)

    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["merchant"] == "Sunset Beach Bistro"
    assert data["subtotal_cents"] == 12000
    assert data["tax_cents"] == 1200
    assert data["tip_cents"] == 2400
    assert data["total_cents"] == 15600
    assert len(data["items"]) == 3
    # Check that item indices were assigned
    assert data["items"][0]["index"] == 0


@pytest.mark.asyncio
async def test_parse_receipt_invalid_base64():
    payload = {
        "trip_id": "trip_bali_2026",
        "image_base64": "not_a_valid_base64_image!!!",
        "currency": "USD"
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/ai/receipt/parse", json=payload)

    assert res.status_code in (400, 500)


@pytest.mark.asyncio
async def test_upload_file_endpoint():
    img = Image.new("RGB", (64, 64), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    files = {"file": ("test_receipt.jpg", buf, "image/jpeg")}
    data = {"currency": "USD"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/ai/receipt/upload", files=files, data=data)

    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "SUCCESS"
    assert res_data["total_cents"] > 0


def test_itemizer_proportional_tax_tip_split():
    """
    Sarah orders Red Snapper ($45.00).
    Alex orders Truffle Fries ($25.00).
    Dave orders Cocktails ($50.00).
    Subtotal: $120.00, Tax: $12.00 (10%), Tip: $24.00 (20%), Total: $156.00.
    """
    receipt = ReceiptParseResponse(
        status="SUCCESS",
        merchant="Sunset Bistro",
        subtotal_cents=12000,
        tax_cents=1200,
        tip_cents=2400,
        total_cents=15600,
        items=[
            ReceiptItem(index=0, name="Red Snapper", qty=1, price_cents=4500),
            ReceiptItem(index=1, name="Truffle Fries", qty=1, price_cents=2500),
            ReceiptItem(index=2, name="Cocktails", qty=1, price_cents=5000),
        ],
        suggested_reply=""
    )

    request = ItemizerSplitRequest(
        receipt=receipt,
        claims={
            "user_sarah": [0],
            "user_alex": [1],
            "user_dave": [2]
        },
        all_members=["user_sarah", "user_alex", "user_dave"],
        split_unclaimed_equally=True
    )

    response = ReceiptItemizerService.calculate_split(request)

    assert response.is_balanced is True
    assert response.discrepancy_cents == 0
    assert response.receipt_total_cents == 15600

    shares = response.shares

    # Sarah: $45 food -> 45/120 = 37.5% -> Tax = $4.50, Tip = $9.00 -> Total = $58.50 (5850 cents)
    assert shares["user_sarah"].items_subtotal_cents == 4500
    assert shares["user_sarah"].proportional_tax_cents == 450
    assert shares["user_sarah"].proportional_tip_cents == 900
    assert shares["user_sarah"].total_cents == 5850

    # Dave: $50 drinks -> 50/120 = 41.67% -> Tax = $5.00, Tip = $10.00 -> Total = $65.00 (6500 cents)
    assert shares["user_dave"].items_subtotal_cents == 5000
    assert shares["user_dave"].proportional_tax_cents == 500
    assert shares["user_dave"].proportional_tip_cents == 1000
    assert shares["user_dave"].total_cents == 6500

    # Alex: $25 fries -> 25/120 = 20.83% -> Tax = $2.50, Tip = $5.00 -> Total = $32.50 (3250 cents)
    assert shares["user_alex"].items_subtotal_cents == 2500
    assert shares["user_alex"].total_cents == 3250

    # Strict sum verification
    total_allocated = sum(s.total_cents for s in shares.values())
    assert total_allocated == 15600


def test_itemizer_shared_item_and_unclaimed_pool():
    """
    Item 0 ($40) co-claimed by Sarah and Alex ($20 each).
    Item 1 ($20) unclaimed (split equally between all 3 members: Sarah, Alex, Dave).
    Subtotal: $60, Tax: $6, Tip: $12, Total: $78 (7800 cents).
    """
    receipt = ReceiptParseResponse(
        status="SUCCESS",
        merchant="Tapas Bar",
        subtotal_cents=6000,
        tax_cents=600,
        tip_cents=1200,
        total_cents=7800,
        items=[
            ReceiptItem(index=0, name="Shared Paella", qty=1, price_cents=4000),
            ReceiptItem(index=1, name="Bread Basket", qty=1, price_cents=2000),
        ],
        suggested_reply=""
    )

    request = ItemizerSplitRequest(
        receipt=receipt,
        claims={
            "user_sarah": [0],
            "user_alex": [0]
        },
        all_members=["user_sarah", "user_alex", "user_dave"],
        split_unclaimed_equally=True
    )

    response = ReceiptItemizerService.calculate_split(request)

    assert response.is_balanced is True
    assert len(response.unclaimed_items) == 1
    assert response.unclaimed_items[0].name == "Bread Basket"

    # Total allocated must exactly match receipt total
    total_allocated = sum(s.total_cents for s in response.shares.values())
    assert total_allocated == 7800
