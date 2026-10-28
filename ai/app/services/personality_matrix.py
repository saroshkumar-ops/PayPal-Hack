from app.schemas import EscalateRoastRequest, EscalateRoastResponse, ButtonItem


class PersonalityMatrixService:
    @staticmethod
    async def generate_escalated_message(request: EscalateRoastRequest) -> EscalateRoastResponse:
        """
        Generates calibrated debt-collection messages across the 5 tiers.
        """
        amount_fmt = f"${request.amount_cents / 100:.2f}"
        buttons = [
            ButtonItem(text=f"💳 Pay {amount_fmt} via PayPal", url=request.paypal_checkout_url)
        ]

        if request.tier == "POLITE_CONCIERGE":
            text = (
                f"Hey {request.debtor_name}! Quick friendly reminder for your {amount_fmt} share "
                f"for {request.expense_description} fronted by {request.creditor_name} 🏖️ Hope you're enjoying the trip!"
            )
        elif request.tier == "PASSIVE_AGGRESSIVE":
            text = (
                f"Must be nice enjoying that rooftop sunset, {request.debtor_name}... while {request.creditor_name} "
                f"is still fronting {amount_fmt} for your {request.expense_description} from {request.hours_overdue}h ago 👀"
            )
        elif request.tier == "DISAPPOINTED_PARENT":
            text = (
                f"{request.debtor_name} beta, I'm not angry, just disappointed. Is this how we raised you? "
                f"To drink craft cocktails while {request.creditor_name} covers your {amount_fmt} {request.expense_description}?"
            )
        elif request.tier == "PUBLIC_ROAST":
            text = (
                f"🚨 **SHAME BOARD ALERT**: {request.debtor_name} has officially entered the Deadbeat Hall of Fame. "
                f"{amount_fmt} for {request.expense_description} is {request.hours_overdue} hours overdue! 🪦"
            )
        elif request.tier == "ITINERARY_EMBARGO":
            text = (
                f"⚖️ **TRIP SANCTION APPLIED**: {request.debtor_name} has been demoted to sleeping on the pull-out couch "
                f"until the {amount_fmt} debt to {request.creditor_name} is settled via PayPal."
            )
        else:
            text = f"Reminder: {request.debtor_name} owes {request.creditor_name} {amount_fmt}."

        return EscalateRoastResponse(
            tier=request.tier,
            generated_text=text,
            image_card_base64=None,
            call_to_action_buttons=buttons
        )
