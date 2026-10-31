package com.shrihari.backend.webhook.dto;

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
public class CelebrationEvent {

    @JsonProperty("event_id")
    private String eventId;

    @JsonProperty("event_type")
    private String eventType;

    @JsonProperty("trip_id")
    private String tripId;

    @JsonProperty("debtor_id")
    private String debtorId;

    @JsonProperty("debtor_name")
    private String debtorName;

    @JsonProperty("amount_cents")
    private long amountCents;

    @JsonProperty("formatted_amount")
    private String formattedAmount;

    @JsonProperty("currency")
    private String currency;

    @JsonProperty("message")
    private String message;

    @JsonProperty("timestamp")
    @Builder.Default
    private Instant timestamp = Instant.now();
}
