package com.shrihari.backend.webhook.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookProcessResult {

    @JsonProperty("status")
    private String status;

    @JsonProperty("event_type")
    private String eventType;

    @JsonProperty("event_id")
    private String eventId;

    @JsonProperty("message")
    private String message;

    @JsonProperty("processed")
    private boolean processed;
}
