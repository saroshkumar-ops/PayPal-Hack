package com.shrihari.backend.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateOrderRequest {

    @JsonProperty("trip_id")
    private String tripId;

    @JsonProperty("debtor_id")
    private String debtorId;

    @JsonProperty("expense_id")
    private String expenseId;

    @JsonProperty("amount_cents")
    private Long amountCents;

    private String currency;
}
