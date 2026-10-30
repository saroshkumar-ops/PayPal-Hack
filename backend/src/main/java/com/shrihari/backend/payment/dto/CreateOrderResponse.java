package com.shrihari.backend.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateOrderResponse {

    @JsonProperty("order_id")
    private String orderId;

    @JsonProperty("approve_url")
    private String approveUrl;

    private String status;

    @JsonProperty("custom_id")
    private String customId;

    @JsonProperty("amount_cents")
    private long amountCents;

    @JsonProperty("formatted_amount")
    private String formattedAmount;
}
