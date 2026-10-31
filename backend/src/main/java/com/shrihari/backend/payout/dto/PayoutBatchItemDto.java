package com.shrihari.backend.payout.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayoutBatchItemDto {

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("member_name")
    private String memberName;

    @JsonProperty("receiver_email")
    private String receiverEmail;

    @JsonProperty("amount_cents")
    private long amountCents;

    @JsonProperty("formatted_amount")
    private String formattedAmount;

    @JsonProperty("currency")
    private String currency;

    @JsonProperty("note")
    private String note;

    @JsonProperty("sender_item_id")
    private String senderItemId;
}
