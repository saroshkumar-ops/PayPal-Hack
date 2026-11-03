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
public class PayoutConfirmRequest {

    @JsonProperty("idempotency_key")
    private String idempotencyKey;

    @JsonProperty("email_subject")
    private String emailSubject;

    @JsonProperty("email_message")
    private String emailMessage;
}
