package com.shrihari.backend.payout.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayoutProposalResponse {

    @JsonProperty("trip_id")
    private String tripId;

    @JsonProperty("currency")
    private String currency;

    @JsonProperty("platform_escrow_cents")
    private long platformEscrowCents;

    @JsonProperty("formatted_platform_escrow")
    private String formattedPlatformEscrow;

    @JsonProperty("total_payout_cents")
    private long totalPayoutCents;

    @JsonProperty("formatted_total_payout")
    private String formattedTotalPayout;

    @JsonProperty("idempotency_key")
    private String idempotencyKey;

    @JsonProperty("requires_confirmation")
    @Builder.Default
    private boolean requiresConfirmation = true;

    @JsonProperty("items")
    private List<PayoutBatchItemDto> items;

    @JsonProperty("warning")
    private String warning;
}
