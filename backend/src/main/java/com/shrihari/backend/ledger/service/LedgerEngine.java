package com.shrihari.backend.ledger.service;

import com.shrihari.backend.expense.dto.ExpenseResponse;
import com.shrihari.backend.expense.model.Expense;
import com.shrihari.backend.expense.model.ExpenseSplit;
import com.shrihari.backend.expense.model.PaymentStatus;
import com.shrihari.backend.expense.repository.ExpenseRepository;
import com.shrihari.backend.ledger.dto.LedgerResponse;
import com.shrihari.backend.ledger.dto.SettlementTransaction;
import com.shrihari.backend.ledger.model.Settlement;
import com.shrihari.backend.ledger.model.SettlementStatus;
import com.shrihari.backend.ledger.repository.SettlementRepository;
import com.shrihari.backend.member.dto.MemberResponse;
import com.shrihari.backend.member.service.TripMemberService;
import com.shrihari.backend.trip.model.Trip;
import com.shrihari.backend.trip.service.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class LedgerEngine {

    private final TripService tripService;
    private final TripMemberService memberService;
    private final ExpenseRepository expenseRepository;
    private final SettlementRepository settlementRepository;
    private final DebtSimplificationService debtSimplificationService;

    @Transactional(readOnly = true)
    public LedgerResponse getTripLedger(String tripId) {
        Trip trip = tripService.findTripEntity(tripId);
        List<MemberResponse> members = memberService.getMembers(tripId);
        List<Expense> expenses = expenseRepository.findByTripIdOrderByTimestampAsc(tripId);
        List<Settlement> completedSettlements = settlementRepository.findByTripIdAndStatus(tripId, SettlementStatus.COMPLETED);

        // Compute platform escrow cents collected from settled member splits
        long escrowCollected = 0L;
        for (Expense expense : expenses) {
            String payer = expense.getPaidBy();
            if (expense.getSplits() != null) {
                for (ExpenseSplit split : expense.getSplits()) {
                    if (!split.getUserId().equals(payer) && split.getPaidStatus() == PaymentStatus.SETTLED) {
                        escrowCollected += split.getOwesCents();
                    }
                }
            }
        }

        long disbursedPayouts = completedSettlements.stream()
                .mapToLong(Settlement::getAmountCents)
                .sum();

        long platformEscrowCents = Math.max(0L, escrowCollected - disbursedPayouts);

        // Calculate double-entry net balances
        Map<String, Long> netBalances = calculateNetBalances(members, expenses, completedSettlements);

        // Compute Bipartite Minimum Cash Flow settlements
        List<SettlementTransaction> settlements = debtSimplificationService.simplifyDebts(netBalances);

        List<ExpenseResponse> expenseResponses = expenses.stream()
                .map(ExpenseResponse::fromEntity)
                .toList();

        return LedgerResponse.builder()
                .tripId(trip.getId())
                .currency(trip.getCurrency())
                .members(members)
                .expenses(expenseResponses)
                .netBalancesCents(netBalances)
                .platformEscrowCents(platformEscrowCents)
                .simplifiedSettlements(settlements)
                .build();
    }

    public Map<String, Long> calculateNetBalances(List<MemberResponse> members, List<Expense> expenses) {
        return calculateNetBalances(members, expenses, Collections.emptyList());
    }

    /**
     * Computes double-entry integer net balances for all members in a trip.
     * Integrates platform escrow vs. direct settlement logic for Task C and Task D.
     */
    public Map<String, Long> calculateNetBalances(
            List<MemberResponse> members,
            List<Expense> expenses,
            List<Settlement> completedSettlements) {

        Map<String, Long> balances = new LinkedHashMap<>();

        // Initialize all known members to 0 balance
        for (MemberResponse member : members) {
            balances.put(member.getUserId(), 0L);
        }

        for (Expense expense : expenses) {
            String payer = expense.getPaidBy();
            long totalAmount = expense.getAmountCents();

            // Payer is credited the full amount fronted
            balances.put(payer, balances.getOrDefault(payer, 0L) + totalAmount);

            // Each debtor is debited their share
            if (expense.getSplits() != null) {
                for (ExpenseSplit split : expense.getSplits()) {
                    String debtor = split.getUserId();
                    long owes = split.getOwesCents();

                    balances.put(debtor, balances.getOrDefault(debtor, 0L) - owes);

                    // When a non-payer debtor settles their split via PayPal (Task C),
                    // debtor's debt is satisfied (+owes).
                    // The funds enter platform escrow; payer is reimbursed upon Batch Payout (Task D).
                    if (!debtor.equals(payer) && split.getPaidStatus() == PaymentStatus.SETTLED) {
                        balances.put(debtor, balances.get(debtor) + owes);
                    }
                }
            }
        }

        // Deduct completed batch payouts (Task D) from recipient balances
        if (completedSettlements != null) {
            for (Settlement s : completedSettlements) {
                String recipient = s.getToUserId();
                balances.put(recipient, balances.getOrDefault(recipient, 0L) - s.getAmountCents());
            }
        }

        return balances;
    }

    @Transactional(readOnly = true)
    public List<SettlementTransaction> getSettlements(String tripId) {
        return getTripLedger(tripId).getSimplifiedSettlements();
    }
}
