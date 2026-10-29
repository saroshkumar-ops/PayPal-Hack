package com.shrihari.backend.expense.model;

public enum PaymentStatus {
    PENDING,
    SETTLED;

    public static PaymentStatus fromString(String status) {
        if (status == null) return PENDING;
        try {
            return PaymentStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return PENDING;
        }
    }
}
