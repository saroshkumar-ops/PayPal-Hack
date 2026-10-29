package com.shrihari.backend.ledger.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettlementTransaction {

    @JsonProperty("from_user_id")
    private String fromUserId;

    @JsonProperty("to_user_id")
    private String toUserId;

    @JsonProperty("amount_cents")
    private long amountCents;

    @JsonProperty("formatted_amount")
    private String formattedAmount;
}
