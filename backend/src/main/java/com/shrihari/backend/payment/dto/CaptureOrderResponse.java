package com.shrihari.backend.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaptureOrderResponse {

    @JsonProperty("order_id")
    private String orderId;

    @JsonProperty("capture_id")
    private String captureId;

    private String status; // "COMPLETED"

    @JsonProperty("custom_id")
    private String customId;

    @JsonProperty("trip_id")
    private String tripId;

    @JsonProperty("debtor_id")
    private String debtorId;

    @JsonProperty("expense_id")
    private String expenseId;

    @JsonProperty("amount_cents")
    private long amountCents;

    @JsonProperty("payer_email")
    private String payerEmail;

    @JsonProperty("settled_at")
    private Instant settledAt;
}
