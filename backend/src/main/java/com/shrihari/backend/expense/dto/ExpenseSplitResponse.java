package com.shrihari.backend.expense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.shrihari.backend.expense.model.ExpenseSplit;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ExpenseSplitResponse {

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("owes_cents")
    private long owesCents;

    @JsonProperty("paid_status")
    private String paidStatus;

    @JsonProperty("paypal_order_id")
    private String paypalOrderId;

    @JsonProperty("payment_url")
    private String paymentUrl;

    public static ExpenseSplitResponse fromEntity(ExpenseSplit split) {
        return ExpenseSplitResponse.builder()
                .userId(split.getUserId())
                .owesCents(split.getOwesCents())
                .paidStatus(split.getPaidStatus().name())
                .paypalOrderId(split.getPaypalOrderId())
                .paymentUrl(split.getPaymentUrl())
                .build();
    }
}
