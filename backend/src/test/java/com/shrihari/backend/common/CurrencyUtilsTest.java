package com.shrihari.backend.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CurrencyUtilsTest {

    @Test
    @DisplayName("Should convert integer cents to formatted dollar string")
    void shouldConvertCentsToFormattedString() {
        assertEquals("80.00", CurrencyUtils.centsToFormattedString(8000L));
        assertEquals("0.00", CurrencyUtils.centsToFormattedString(0L));
        assertEquals("33.34", CurrencyUtils.centsToFormattedString(3334L));
        assertEquals("33.33", CurrencyUtils.centsToFormattedString(3333L));
        assertEquals("0.05", CurrencyUtils.centsToFormattedString(5L));
        assertEquals("12450.99", CurrencyUtils.centsToFormattedString(1245099L));
    }

    @Test
    @DisplayName("Should parse dollar strings to integer cents")
    void shouldParseDollarsToCents() {
        assertEquals(8000L, CurrencyUtils.parseDollarsToCents("80.00"));
        assertEquals(8000L, CurrencyUtils.parseDollarsToCents("80"));
        assertEquals(3334L, CurrencyUtils.parseDollarsToCents("33.34"));
        assertEquals(0L, CurrencyUtils.parseDollarsToCents("0"));
        assertEquals(0L, CurrencyUtils.parseDollarsToCents(null));
        assertEquals(0L, CurrencyUtils.parseDollarsToCents("  "));
    }

    @Test
    @DisplayName("Should convert double dollars to integer cents safely")
    void shouldConvertDoubleToCents() {
        assertEquals(8000L, CurrencyUtils.doubleToCents(80.0));
        assertEquals(3334L, CurrencyUtils.doubleToCents(33.34));
        assertEquals(24000L, CurrencyUtils.doubleToCents(240.00));
    }
}
