package com.shrihari.backend.expense.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.shrihari.backend.expense.model.Expense;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseResponse {

    @JsonProperty("expense_id")
    private String expenseId;

    @JsonProperty("paid_by")
    private String paidBy;

    @JsonProperty("amount_cents")
    private long amountCents;

    private String description;

    private String category;

    private Instant timestamp;

    @JsonProperty("split_type")
    private String splitType;

    private List<ExpenseSplitResponse> splits;

    public static ExpenseResponse fromEntity(Expense expense) {
        return ExpenseResponse.builder()
                .expenseId(expense.getId())
                .paidBy(expense.getPaidBy())
                .amountCents(expense.getAmountCents())
                .description(expense.getDescription())
                .category(expense.getCategory().name())
                .timestamp(expense.getTimestamp())
                .splitType(expense.getSplitType().name())
                .splits(expense.getSplits() != null
                        ? expense.getSplits().stream().map(ExpenseSplitResponse::fromEntity).toList()
                        : List.of())
                .build();
    }
}
