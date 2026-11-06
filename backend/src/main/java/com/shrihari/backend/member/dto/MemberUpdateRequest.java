package com.shrihari.backend.member.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemberUpdateRequest {

    private String name;

    private String handle;

    @JsonProperty("paypal_email")
    private String paypalEmail;

    private String role; // "ORGANIZER" or "MEMBER"

    @JsonProperty("roast_consent")
    private String roastConsent; // "MILD", "SPICY", "NO_ROAST"
}

