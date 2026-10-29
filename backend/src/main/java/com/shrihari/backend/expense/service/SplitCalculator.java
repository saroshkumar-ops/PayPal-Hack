package com.shrihari.backend.expense.service;

import com.shrihari.backend.common.IdGenerator;
import com.shrihari.backend.common.exception.InvalidSplitException;
import com.shrihari.backend.expense.dto.CustomSplitDto;
import com.shrihari.backend.expense.dto.ItemClaimDto;
import com.shrihari.backend.expense.model.ExpenseSplit;
import com.shrihari.backend.expense.model.PaymentStatus;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

@Component
public class SplitCalculator {

    /**
     * Calculates an equal split with deterministic remainder cent distribution.
     * Guaranteed: sum(splits.owesCents) == totalCents with ZERO floating-point drift.
     */
    public List<ExpenseSplit> calculateEqualSplit(
            String expenseId,
            String payerId,
            long totalCents,
            List<String> userIds) {

        if (userIds == null || userIds.isEmpty()) {
            throw new InvalidSplitException("At least one user must be included in an equal split.");
        }
        if (totalCents < 0) {
            throw new InvalidSplitException("Expense amount cannot be negative.");
        }

        int n = userIds.size();
        long baseShare = totalCents / n;
        long remainder = totalCents % n;

        List<ExpenseSplit> splits = new ArrayList<>(n);

        for (int i = 0; i < n; i++) {
            String userId = userIds.get(i);
            long share = baseShare + (i < remainder ? 1L : 0L);

            boolean isPayer = userId.equals(payerId);
            splits.add(ExpenseSplit.builder()
                    .id(IdGenerator.generateId("split"))
                    .expenseId(expenseId)
                    .userId(userId)
                    .owesCents(share)
                    .paidStatus(isPayer ? PaymentStatus.SETTLED : PaymentStatus.PENDING)
                    .settledAt(isPayer ? Instant.now() : null)
                    .build());
        }

        return splits;
    }

    /**
     * Calculates and validates an exact split based on custom cent values per user.
     */
    public List<ExpenseSplit> calculateExactSplit(
            String expenseId,
            String payerId,
            long totalCents,
            List<CustomSplitDto> customSplits) {

        if (customSplits == null || customSplits.isEmpty()) {
            throw new InvalidSplitException("Custom splits list cannot be empty for EXACT split.");
        }

        long sum = 0L;
        List<ExpenseSplit> splits = new ArrayList<>(customSplits.size());

        for (CustomSplitDto custom : customSplits) {
            if (custom.getUserId() == null || custom.getUserId().trim().isEmpty()) {
                throw new InvalidSplitException("User ID must not be empty in custom splits.");
            }
            if (custom.getOwesCents() == null || custom.getOwesCents() < 0) {
                throw new InvalidSplitException("Owed cents cannot be negative for user: " + custom.getUserId());
            }

            sum += custom.getOwesCents();
            boolean isPayer = custom.getUserId().equals(payerId);

            splits.add(ExpenseSplit.builder()
                    .id(IdGenerator.generateId("split"))
                    .expenseId(expenseId)
                    .userId(custom.getUserId().trim())
                    .owesCents(custom.getOwesCents())
                    .paidStatus(isPayer ? PaymentStatus.SETTLED : PaymentStatus.PENDING)
                    .settledAt(isPayer ? Instant.now() : null)
                    .build());
        }

        if (sum != totalCents) {
            throw new InvalidSplitException(String.format(
                    "Exact split total (%d cents) does not match expense amount (%d cents). Difference: %d cents",
                    sum, totalCents, (totalCents - sum)));
        }

        return splits;
    }

    /**
     * Calculates an itemized split with proportional tax and tip distribution.
     * Each item is split among its claimants, then tax and tip are distributed proportionately.
     */
    public List<ExpenseSplit> calculateItemizedSplit(
            String expenseId,
            String payerId,
            long totalCents,
            List<ItemClaimDto> items,
            Long taxCents,
            Long tipCents) {

        if (items == null || items.isEmpty()) {
            throw new InvalidSplitException("Items list cannot be empty for ITEMIZED split.");
        }

        Map<String, Long> userItemTotals = new LinkedHashMap<>();
        long itemsSubtotal = 0L;

        // 1. Calculate each user's direct items total
        for (ItemClaimDto item : items) {
            if (item.getClaimedByUserIds() == null || item.getClaimedByUserIds().isEmpty()) {
                throw new InvalidSplitException("Item '" + item.getName() + "' must be claimed by at least one user.");
            }
            if (item.getPriceCents() < 0) {
                throw new InvalidSplitException("Item price cannot be negative: " + item.getName());
            }

            itemsSubtotal += item.getPriceCents();
            int claimCount = item.getClaimedByUserIds().size();
            long baseShare = item.getPriceCents() / claimCount;
            long rem = item.getPriceCents() % claimCount;

            for (int i = 0; i < claimCount; i++) {
                String uid = item.getClaimedByUserIds().get(i);
                long share = baseShare + (i < rem ? 1L : 0L);
                userItemTotals.put(uid, userItemTotals.getOrDefault(uid, 0L) + share);
            }
        }

        long safeTax = (taxCents != null && taxCents > 0) ? taxCents : 0L;
        long safeTip = (tipCents != null && tipCents > 0) ? tipCents : 0L;
        long additional = safeTax + safeTip;

        long expectedTotal = itemsSubtotal + additional;
        if (totalCents != expectedTotal) {
            // If totalCents differs from subtotal + tax + tip, adjust or validate
            if (additional == 0L && totalCents > itemsSubtotal) {
                additional = totalCents - itemsSubtotal;
            } else {
                throw new InvalidSplitException(String.format(
                        "Itemized subtotal (%d) + tax/tip (%d) = %d cents does not match total amount (%d cents)",
                        itemsSubtotal, (safeTax + safeTip), expectedTotal, totalCents));
            }
        }

        Map<String, Long> finalShares = new LinkedHashMap<>();
        long distributedAdditional = 0L;

        if (itemsSubtotal > 0 && additional > 0) {
            List<Map.Entry<String, Long>> sortedUsers = new ArrayList<>(userItemTotals.entrySet());
            sortedUsers.sort((a, b) -> Long.compare(b.getValue(), a.getValue())); // descending by items consumed

            for (Map.Entry<String, Long> entry : sortedUsers) {
                String uid = entry.getKey();
                long userItems = entry.getValue();
                long userAddShare = (userItems * additional) / itemsSubtotal;
                finalShares.put(uid, userItems + userAddShare);
                distributedAdditional += userAddShare;
            }

            // Distribute remaining additional cents to highest spenders
            long remainingAdditional = additional - distributedAdditional;
            for (int i = 0; i < remainingAdditional; i++) {
                String uid = sortedUsers.get(i % sortedUsers.size()).getKey();
                finalShares.put(uid, finalShares.get(uid) + 1L);
            }
        } else {
            finalShares.putAll(userItemTotals);
        }

        List<ExpenseSplit> splits = new ArrayList<>();
        for (Map.Entry<String, Long> entry : finalShares.entrySet()) {
            String uid = entry.getKey();
            long share = entry.getValue();
            boolean isPayer = uid.equals(payerId);

            splits.add(ExpenseSplit.builder()
                    .id(IdGenerator.generateId("split"))
                    .expenseId(expenseId)
                    .userId(uid)
                    .owesCents(share)
                    .paidStatus(isPayer ? PaymentStatus.SETTLED : PaymentStatus.PENDING)
                    .settledAt(isPayer ? Instant.now() : null)
                    .build());
        }

        return splits;
    }
}
