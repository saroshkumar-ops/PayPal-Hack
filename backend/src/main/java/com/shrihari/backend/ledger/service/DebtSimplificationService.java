package com.shrihari.backend.ledger.service;

import com.shrihari.backend.common.CurrencyUtils;
import com.shrihari.backend.ledger.dto.SettlementTransaction;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Implements the Bipartite Minimum Cash Flow algorithm (Greedy max-debtor to max-creditor matching).
 * Reduces O(N^2) multi-party group debts down to at most N-1 optimal settlement transactions.
 * Resolves circular debts (e.g. A->B $20, B->C $20, C->A $20) to zero transactions.
 */
@Service
public class DebtSimplificationService {

    private record ParticipantBalance(String userId, long amountCents) {}

    public List<SettlementTransaction> simplifyDebts(Map<String, Long> netBalances) {
        if (netBalances == null || netBalances.isEmpty()) {
            return Collections.emptyList();
        }

        // Max heaps ordered descending by cents
        PriorityQueue<ParticipantBalance> creditors = new PriorityQueue<>(
                (a, b) -> Long.compare(b.amountCents(), a.amountCents()));
        PriorityQueue<ParticipantBalance> debtors = new PriorityQueue<>(
                (a, b) -> Long.compare(b.amountCents(), a.amountCents()));

        for (Map.Entry<String, Long> entry : netBalances.entrySet()) {
            String userId = entry.getKey();
            long balance = entry.getValue();

            if (balance > 0) {
                creditors.offer(new ParticipantBalance(userId, balance));
            } else if (balance < 0) {
                debtors.offer(new ParticipantBalance(userId, Math.abs(balance)));
            }
        }

        List<SettlementTransaction> settlements = new ArrayList<>();

        while (!creditors.isEmpty() && !debtors.isEmpty()) {
            ParticipantBalance creditor = creditors.poll();
            ParticipantBalance debtor = debtors.poll();

            long settleCents = Math.min(creditor.amountCents(), debtor.amountCents());

            if (settleCents > 0) {
                settlements.add(SettlementTransaction.builder()
                        .fromUserId(debtor.userId())
                        .toUserId(creditor.userId())
                        .amountCents(settleCents)
                        .formattedAmount(CurrencyUtils.centsToFormattedString(settleCents))
                        .build());
            }

            long creditorRemaining = creditor.amountCents() - settleCents;
            long debtorRemaining = debtor.amountCents() - settleCents;

            if (creditorRemaining > 0) {
                creditors.offer(new ParticipantBalance(creditor.userId(), creditorRemaining));
            }
            if (debtorRemaining > 0) {
                debtors.offer(new ParticipantBalance(debtor.userId(), debtorRemaining));
            }
        }

        return settlements;
    }
}
