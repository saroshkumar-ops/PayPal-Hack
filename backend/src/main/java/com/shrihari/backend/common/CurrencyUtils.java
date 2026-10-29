package com.shrihari.backend.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Utility functions for strictly handling monetary amounts in integer cents.
 * Prevents floating-point precision drift across all financial calculations.
 */
public final class CurrencyUtils {

    private CurrencyUtils() {}

    /**
     * Converts integer cents to formatted string with 2 decimal places (e.g. 8000 -> "80.00").
     */
    public static String centsToFormattedString(long cents) {
        BigDecimal decimal = BigDecimal.valueOf(cents).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        return String.format("%.2f", decimal);
    }

    /**
     * Converts a dollar string (e.g. "80.00", "80") to integer cents (8000).
     */
    public static long parseDollarsToCents(String dollars) {
        if (dollars == null || dollars.trim().isEmpty()) {
            return 0L;
        }
        BigDecimal decimal = new BigDecimal(dollars.trim());
        return decimal.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValue();
    }

    /**
     * Converts double dollars to integer cents safely with rounding.
     */
    public static long doubleToCents(double dollars) {
        return Math.round(dollars * 100.0);
    }
}
