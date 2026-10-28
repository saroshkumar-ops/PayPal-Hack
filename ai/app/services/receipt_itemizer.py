from typing import Dict, List, Set
from app.schemas import (
    ReceiptParseResponse,
    ReceiptItem,
    ItemizerSplitRequest,
    ItemizerSplitResponse,
    MemberSplitShare
)


class ReceiptItemizerService:
    @staticmethod
    def calculate_split(request: ItemizerSplitRequest) -> ItemizerSplitResponse:
        """
        Calculates fair itemized group split with proportional tax and tip allocation.
        Guarantees zero rounding drift (sum of member shares == receipt total cents exactly).
        """
        receipt = request.receipt
        items = receipt.items
        claims = request.claims
        all_members = list(request.all_members)

        # Ensure all claimants are part of members list
        for user_id in claims.keys():
            if user_id not in all_members:
                all_members.append(user_id)

        if not all_members:
            all_members = list(claims.keys()) if claims else ["organizer"]

        # 1. Map item claims (item_index -> list of claiming user_ids)
        item_claimants: Dict[int, List[str]] = {idx: [] for idx in range(len(items))}
        for user_id, claimed_indices in claims.items():
            for idx in claimed_indices:
                if 0 <= idx < len(items):
                    item_claimants[idx].append(user_id)

        # Track user claimed subtotals and names
        user_item_subtotal: Dict[str, int] = {uid: 0 for uid in all_members}
        user_claimed_names: Dict[str, List[str]] = {uid: [] for uid in all_members}
        unclaimed_items: List[ReceiptItem] = []
        unclaimed_subtotal_cents = 0

        # 2. Allocate item costs
        for idx, item in enumerate(items):
            claimants = item_claimants.get(idx, [])
            total_item_cost = item.price_cents * item.qty

            if not claimants:
                unclaimed_items.append(item)
                unclaimed_subtotal_cents += total_item_cost
            else:
                share_per_person = total_item_cost // len(claimants)
                remainder = total_item_cost % len(claimants)

                for c_idx, user_id in enumerate(claimants):
                    user_share = share_per_person + (1 if c_idx < remainder else 0)
                    user_item_subtotal[user_id] += user_share
                    user_claimed_names[user_id].append(item.name)

        # 3. Handle unclaimed items
        user_unclaimed_share: Dict[str, int] = {uid: 0 for uid in all_members}
        if request.split_unclaimed_equally and unclaimed_subtotal_cents > 0 and all_members:
            base_unclaimed_share = unclaimed_subtotal_cents // len(all_members)
            unclaimed_remainder = unclaimed_subtotal_cents % len(all_members)

            for u_idx, uid in enumerate(all_members):
                user_unclaimed_share[uid] = base_unclaimed_share + (1 if u_idx < unclaimed_remainder else 0)

        # 4. Proportional Tax & Tip Calculation
        total_subtotal = receipt.subtotal_cents if receipt.subtotal_cents > 0 else (
            sum(user_item_subtotal.values()) + unclaimed_subtotal_cents
        )

        tax_cents = receipt.tax_cents
        tip_cents = receipt.tip_cents
        shares: Dict[str, MemberSplitShare] = {}

        for uid in all_members:
            user_subtotal = user_item_subtotal[uid] + user_unclaimed_share[uid]

            if total_subtotal > 0:
                prop_tax = int(round(tax_cents * (user_subtotal / total_subtotal)))
                prop_tip = int(round(tip_cents * (user_subtotal / total_subtotal)))
            else:
                prop_tax = tax_cents // len(all_members)
                prop_tip = tip_cents // len(all_members)

            user_total = user_subtotal + prop_tax + prop_tip

            claimed_str = ", ".join(user_claimed_names[uid]) if user_claimed_names[uid] else "No direct items claimed"
            breakdown = (
                f"Items: ${user_item_subtotal[uid] / 100:.2f} ({claimed_str}) | "
                f"Shared Pool: ${user_unclaimed_share[uid] / 100:.2f} | "
                f"Tax: ${prop_tax / 100:.2f} | Tip: ${prop_tip / 100:.2f} | "
                f"Total: ${user_total / 100:.2f}"
            )

            shares[uid] = MemberSplitShare(
                user_id=uid,
                claimed_item_names=user_claimed_names[uid],
                items_subtotal_cents=user_item_subtotal[uid],
                proportional_tax_cents=prop_tax,
                proportional_tip_cents=prop_tip,
                unclaimed_pool_share_cents=user_unclaimed_share[uid],
                total_cents=user_total,
                breakdown_text=breakdown
            )

        # 5. Deterministic Zero-Drift Reconciler
        sum_allocated = sum(s.total_cents for s in shares.values())
        drift = receipt.total_cents - sum_allocated

        if drift != 0 and all_members:
            # Reconcile discrepancy by adjusting highest spender (or first member)
            highest_user = max(all_members, key=lambda u: shares[u].total_cents)
            updated_share = shares[highest_user].total_cents + drift
            shares[highest_user].total_cents = updated_share

        final_sum = sum(s.total_cents for s in shares.values())
        is_balanced = (final_sum == receipt.total_cents)
        discrepancy = receipt.total_cents - final_sum

        return ItemizerSplitResponse(
            receipt_total_cents=receipt.total_cents,
            shares=shares,
            unclaimed_items=unclaimed_items,
            is_balanced=is_balanced,
            discrepancy_cents=discrepancy
        )
