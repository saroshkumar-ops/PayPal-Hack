import asyncio
import json
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
from core.config import settings
from core.schemas import EscalateRoastRequest, AgentDecideRequest, MemberSummary, AgentLoopRequest, DebtEntry
from escalation.personality_service import PersonalityMatrixService
from agent.agent_service import AgentRouterService
from agent.agent_loop_service import AgentLoopService

async def main():
    print("=" * 60)
    print("TESTING REAL GROQ LLM INFERENCE")
    print("=" * 60)
    print(f"USE_MOCK_AI: {settings.USE_MOCK_AI}")
    print(f"GROQ_KEY configured: {bool(settings.GROQ_API_KEY)}")
    print(f"Model configured: llama-3.3-70b-versatile\n")

    # 1. Test Escalation Tiers with Real Groq LLM
    print("--- 1. Testing Live Personality Roasts via Groq ---")
    tiers = [
        ("POLITE_CONCIERGE", 6, "NO_ROAST"),
        ("PASSIVE_AGGRESSIVE", 18, "MILD"),
        ("DISAPPOINTED_PARENT", 36, "SPICY"),
        ("PUBLIC_ROAST", 60, "SPICY"),
        ("ITINERARY_EMBARGO", 80, "SPICY"),
    ]

    for tier, hours, consent in tiers:
        req = EscalateRoastRequest(
            trip_id="trip_bali_2026",
            debtor_id="user_02",
            debtor_name="Alex",
            debtor_handle="@alex_travels",
            creditor_name="Sarah",
            amount_cents=8550,
            currency="USD",
            expense_description="Seafood Beach Dinner & Cocktails",
            hours_overdue=hours,
            tier=tier,
            roast_consent=consent,
            paypal_checkout_url="https://paypal.com/pay/test1234",
        )
        resp = await PersonalityMatrixService.generate_escalated_message(req)
        print(f"\n[{tier}] (Consent: {consent}, Overdue: {hours}h):")
        print(f"Generated text: \"{resp.generated_text}\"")

    # 2. Test Live Intent Routing via Groq
    print("\n" + "=" * 60)
    print("--- 2. Testing Live Intent Classification via Groq ---")
    members = [
        MemberSummary(user_id="user_01", name="Sarah", handle="@sarah_c"),
        MemberSummary(user_id="user_02", name="Alex", handle="@alex_travels"),
        MemberSummary(user_id="user_03", name="Dave", handle="@dave_k"),
    ]

    chat_messages = [
        "Hey everyone, I just paid $45 for the surfboards rental for me and @alex_travels and @sarah_c",
        "Could you check who owes what right now?",
    ]

    for msg in chat_messages:
        req = AgentDecideRequest(
            trip_id="trip_bali_2026",
            sender_id="user_03",
            sender_name="Dave",
            message_text=msg,
            members=members,
        )
        resp = await AgentRouterService.decide_intent(req)
        print(f"\nInput: \"{msg}\"")
        print(f"Tool / Model used: {resp.tool_called}")
        print(f"Action: {resp.action} (Confidence: {resp.confidence})")
        print(f"Reply: \"{resp.reply_text}\"")
        if resp.parsed_data:
            print(f"Parsed data: {resp.parsed_data.model_dump()}")

    print("\n" + "=" * 60)
    print("ALL REAL LLM TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
