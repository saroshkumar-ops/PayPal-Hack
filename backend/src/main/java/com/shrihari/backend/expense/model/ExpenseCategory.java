package com.shrihari.backend.expense.model;

public enum ExpenseCategory {
    LODGING,
    FOOD,
    TRANSPORT,
    ACTIVITIES,
    OTHER;

    public static ExpenseCategory fromString(String category) {
        if (category == null) return OTHER;
        try {
            return ExpenseCategory.valueOf(category.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return OTHER;
        }
    }
}
