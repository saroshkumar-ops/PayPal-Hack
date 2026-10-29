package com.shrihari.backend.expense.service;

import com.shrihari.backend.common.exception.InvalidSplitException;
import com.shrihari.backend.expense.dto.CustomSplitDto;
import com.shrihari.backend.expense.dto.ItemClaimDto;
import com.shrihari.backend.expense.model.ExpenseSplit;
import com.shrihari.backend.expense.model.PaymentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SplitCalculatorTest {

    private SplitCalculator splitCalculator;

    @BeforeEach
    void setUp() {
        splitCalculator = new SplitCalculator();
    }

    @Test
    @DisplayName("Equal Split: $100 split 3 ways must distribute remainder cents with zero drift")
    void testEqualSplitWithRemainder() {
        // $100.00 = 10,000 cents split 3 ways -> 3,334 + 3,333 + 3,333 = 10,000
        List<String> users = List.of("user_01", "user_02", "user_03");
        List<ExpenseSplit> splits = splitCalculator.calculateEqualSplit("exp_01", "user_01", 10000L, users);

        assertEquals(3, splits.size());
        assertEquals(3334L, splits.get(0).getOwesCents());
        assertEquals(3333L, splits.get(1).getOwesCents());
        assertEquals(3333L, splits.get(2).getOwesCents());

        // Zero drift check
        long sum = splits.stream().mapToLong(ExpenseSplit::getOwesCents).sum();
        assertEquals(10000L, sum);

        // Payer's status should be SETTLED, others PENDING
        assertEquals(PaymentStatus.SETTLED, splits.get(0).getPaidStatus());
        assertEquals(PaymentStatus.PENDING, splits.get(1).getPaidStatus());
        assertEquals(PaymentStatus.PENDING, splits.get(2).getPaidStatus());
    }

    @Test
    @DisplayName("Equal Split: Remainder cents distributed across 4 users correctly")
    void testEqualSplitRemainderFourUsers() {
        // 1001 cents split 4 ways -> 251, 250, 250, 250
        List<String> users = List.of("u1", "u2", "u3", "u4");
        List<ExpenseSplit> splits = splitCalculator.calculateEqualSplit("exp_02", "u1", 1001L, users);

        assertEquals(4, splits.size());
        assertEquals(251L, splits.get(0).getOwesCents());
        assertEquals(250L, splits.get(1).getOwesCents());
        assertEquals(250L, splits.get(2).getOwesCents());
        assertEquals(250L, splits.get(3).getOwesCents());

        long sum = splits.stream().mapToLong(ExpenseSplit::getOwesCents).sum();
        assertEquals(1001L, sum);
    }

    @Test
    @DisplayName("Exact Split: Custom amounts validate exact sum match")
    void testExactSplitValid() {
        List<CustomSplitDto> custom = List.of(
                new CustomSplitDto("user_01", 8000L),
                new CustomSplitDto("user_02", 10000L),
                new CustomSplitDto("user_03", 6000L)
        );

        List<ExpenseSplit> splits = splitCalculator.calculateExactSplit("exp_03", "user_01", 24000L, custom);

        assertEquals(3, splits.size());
        long sum = splits.stream().mapToLong(ExpenseSplit::getOwesCents).sum();
        assertEquals(24000L, sum);

        assertEquals(PaymentStatus.SETTLED, splits.get(0).getPaidStatus());
        assertEquals(PaymentStatus.PENDING, splits.get(1).getPaidStatus());
        assertEquals(PaymentStatus.PENDING, splits.get(2).getPaidStatus());
    }

    @Test
    @DisplayName("Exact Split: Should throw exception on sum mismatch")
    void testExactSplitMismatchThrows() {
        List<CustomSplitDto> custom = List.of(
                new CustomSplitDto("user_01", 8000L),
                new CustomSplitDto("user_02", 8000L)
        );

        // Sum is 16000, but total is 24000
        InvalidSplitException ex = assertThrows(InvalidSplitException.class, () ->
                splitCalculator.calculateExactSplit("exp_04", "user_01", 24000L, custom));

        assertTrue(ex.getMessage().contains("does not match expense amount"));
    }

    @Test
    @DisplayName("Itemized Split: Proportional tax and tip distribution balances exactly")
    void testItemizedSplitWithTaxAndTip() {
        // Items:
        // Steak: $40 (4000 cents) -> user_01
        // Pasta: $40 (4000 cents) -> user_02
        // Cocktails: $40 (4000 cents) -> user_02, user_03 ($20 each = 2000 cents)
        // Subtotal = 12000 cents ($120.00)
        // Tax = 1000 cents ($10.00)
        // Tip = 2000 cents ($20.00)
        // Total = 15000 cents ($150.00)
        List<ItemClaimDto> items = List.of(
                new ItemClaimDto("Steak", 4000L, List.of("user_01")),
                new ItemClaimDto("Pasta", 4000L, List.of("user_02")),
                new ItemClaimDto("Cocktails", 4000L, List.of("user_02", "user_03"))
        );

        List<ExpenseSplit> splits = splitCalculator.calculateItemizedSplit(
                "exp_item", "user_01", 15000L, items, 1000L, 2000L);

        assertEquals(3, splits.size());
        long totalSum = splits.stream().mapToLong(ExpenseSplit::getOwesCents).sum();
        assertEquals(15000L, totalSum, "Total itemized splits must balance to exactly 15,000 cents");

        // Verify payer user_01 is SETTLED, others are PENDING
        ExpenseSplit s1 = splits.stream().filter(s -> s.getUserId().equals("user_01")).findFirst().orElseThrow();
        ExpenseSplit s2 = splits.stream().filter(s -> s.getUserId().equals("user_02")).findFirst().orElseThrow();
        ExpenseSplit s3 = splits.stream().filter(s -> s.getUserId().equals("user_03")).findFirst().orElseThrow();

        assertEquals(PaymentStatus.SETTLED, s1.getPaidStatus());
        assertEquals(PaymentStatus.PENDING, s2.getPaidStatus());
        assertEquals(PaymentStatus.PENDING, s3.getPaidStatus());
    }
}
