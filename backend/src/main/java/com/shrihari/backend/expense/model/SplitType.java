package com.shrihari.backend.expense.model;

public enum SplitType {
    EQUAL,
    EXACT,
    ITEMIZED;

    public static SplitType fromString(String type) {
        if (type == null) return EQUAL;
        try {
            return SplitType.valueOf(type.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return EQUAL;
        }
    }
}
