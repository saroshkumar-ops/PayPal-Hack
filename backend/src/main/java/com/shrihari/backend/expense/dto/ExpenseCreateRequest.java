package com.shrihari.backend.expense.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseCreateRequest {

    @JsonProperty("expense_id")
    private String expenseId;

    @JsonProperty("paid_by")
    private String paidBy;

    @JsonProperty("amount_cents")
    private Long amountCents;

    @JsonProperty("amount")
    private Double amount;

    private String description;

    private String category; // "LODGING", "FOOD", etc.

    @JsonProperty("split_type")
    private String splitType; // "EQUAL", "EXACT", "ITEMIZED"

    @JsonProperty("split_with_user_ids")
    private List<String> splitWithUserIds;

    @JsonProperty("custom_splits")
    private List<CustomSplitDto> customSplits;

    @JsonProperty("items")
    private List<ItemClaimDto> items;

    @JsonProperty("tax_cents")
    private Long taxCents;

    @JsonProperty("tip_cents")
    private Long tipCents;
}
