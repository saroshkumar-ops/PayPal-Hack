package com.shrihari.backend.payout.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayoutBatchStatusResponse {

    @JsonProperty("payout_batch_id")
    private String payoutBatchId;

    @JsonProperty("batch_status")
    private String batchStatus;

    @JsonProperty("sender_batch_id")
    private String senderBatchId;

    @JsonProperty("total_amount")
    private String totalAmount;

    @JsonProperty("currency")
    private String currency;

    @JsonProperty("created_at")
    private Instant createdAt;

    @JsonProperty("items_count")
    private int itemsCount;
}
