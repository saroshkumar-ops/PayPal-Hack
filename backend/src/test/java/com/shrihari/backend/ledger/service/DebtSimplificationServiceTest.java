package com.shrihari.backend.ledger.service;

import com.shrihari.backend.ledger.dto.SettlementTransaction;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class DebtSimplificationServiceTest {

    private DebtSimplificationService debtSimplificationService;

    @BeforeEach
    void setUp() {
        debtSimplificationService = new DebtSimplificationService();
    }

    @Test
    @DisplayName("BENCHMARK TEST: Circular debt (A owes B $20, B owes C $20, C owes A $20) simplifies to 0 transactions")
    void testCircularDebtSimplification() {
        // A owes B $20, B owes C $20, C owes A $20
        // Net balance for all three is exactly 0:
        // A: +20 (from C) - 20 (to B) = 0
        // B: +20 (from A) - 20 (to C) = 0
        // C: +20 (from B) - 20 (to A) = 0
        Map<String, Long> netBalances = new HashMap<>();
        netBalances.put("A", 0L);
        netBalances.put("B", 0L);
        netBalances.put("C", 0L);

        List<SettlementTransaction> settlements = debtSimplificationService.simplifyDebts(netBalances);

        assertNotNull(settlements);
        assertTrue(settlements.isEmpty(), "Circular debt with zero net balances must produce 0 transactions");
    }

    @Test
    @DisplayName("Contract 1 Scenario: Sarah fronts $240 villa deposit, Alex and Dave owe $80 each")
    void testContractOneVillaDepositScenario() {
        // Sarah (+16,000 cents), Alex (-8,000 cents), Dave (-8,000 cents)
        Map<String, Long> netBalances = new HashMap<>();
        netBalances.put("user_01", 16000L); // Sarah (creditor)
        netBalances.put("user_02", -8000L); // Alex (debtor)
        netBalances.put("user_03", -8000L); // Dave (debtor)

        List<SettlementTransaction> settlements = debtSimplificationService.simplifyDebts(netBalances);

        assertEquals(2, settlements.size(), "Should produce at most N-1 (2) settlements");

        long totalSettled = settlements.stream().mapToLong(SettlementTransaction::getAmountCents).sum();
        assertEquals(16000L, totalSettled);

        for (SettlementTransaction s : settlements) {
            assertEquals("user_01", s.getToUserId(), "All money must flow to Sarah");
            assertEquals(8000L, s.getAmountCents(), "Each debtor must pay exactly 8000 cents ($80.00)");
            assertEquals("80.00", s.getFormattedAmount());
        }
    }

    @Test
    @DisplayName("Transitive Debt Chain: A owes B $50, B owes D $30 simplifies directly to D without intermediate hop")
    void testTransitiveDebtChain() {
        // A: -5000, B: +2000, C: 0, D: +3000
        Map<String, Long> netBalances = new HashMap<>();
        netBalances.put("A", -5000L);
        netBalances.put("B", 2000L);
        netBalances.put("C", 0L);
        netBalances.put("D", 3000L);

        List<SettlementTransaction> settlements = debtSimplificationService.simplifyDebts(netBalances);

        assertEquals(2, settlements.size(), "A directly settles B and D, bypassing C entirely");

        long totalSettled = settlements.stream().mapToLong(SettlementTransaction::getAmountCents).sum();
        assertEquals(5000L, totalSettled);

        // Verify A is the payer in both
        assertTrue(settlements.stream().allMatch(s -> s.getFromUserId().equals("A")));
    }

    @Test
    @DisplayName("Empty or All-Zero Balances: Produces empty settlement list")
    void testEmptyBalances() {
        List<SettlementTransaction> empty = debtSimplificationService.simplifyDebts(Map.of());
        assertTrue(empty.isEmpty());

        List<SettlementTransaction> nullBalances = debtSimplificationService.simplifyDebts(null);
        assertTrue(nullBalances.isEmpty());
    }
}
