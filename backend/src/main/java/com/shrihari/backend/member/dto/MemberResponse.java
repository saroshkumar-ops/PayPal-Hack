package com.shrihari.backend.member.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.shrihari.backend.member.model.TripMember;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemberResponse {

    @JsonProperty("user_id")
    private String userId;

    private String name;

    private String handle;

    @JsonProperty("paypal_email")
    private String paypalEmail;

    private String role;

    @JsonProperty("roast_consent")
    private String roastConsent;

    public static MemberResponse fromEntity(TripMember member) {
        return MemberResponse.builder()
                .userId(member.getUserId())
                .name(member.getName())
                .handle(member.getHandle())
                .paypalEmail(member.getPaypalEmail())
                .role(member.getRole().name().toLowerCase())
                .roastConsent(member.getRoastConsent().name())
                .build();
    }
}
