package com.shrihari.backend.payout.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayoutConfirmResponse {

    @JsonProperty("trip_id")
    private String tripId;

    @JsonProperty("payout_batch_id")
    private String payoutBatchId;

    @JsonProperty("batch_status")
    private String batchStatus;

    @JsonProperty("idempotency_key")
    private String idempotencyKey;

    @JsonProperty("total_disbursed_cents")
    private long totalDisbursedCents;

    @JsonProperty("formatted_total_disbursed")
    private String formattedTotalDisbursed;

    @JsonProperty("currency")
    private String currency;

    @JsonProperty("items")
    private List<PayoutBatchItemDto> items;

    @JsonProperty("settled_recipients_count")
    private int settledRecipientsCount;

    @JsonProperty("is_idempotent_replay")
    private boolean isIdempotentReplay;

    @JsonProperty("executed_at")
    private Instant executedAt;

    @JsonProperty("message")
    private String message;
}
