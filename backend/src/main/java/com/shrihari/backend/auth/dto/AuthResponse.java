package com.shrihari.backend.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    @JsonProperty("access_token")
    private String accessToken;

    @JsonProperty("token_type")
    @Builder.Default
    private String tokenType = "Bearer";

    @JsonProperty("user_id")
    private String userId;

    private String email;
    private String name;
    private String handle;

    @JsonProperty("paypal_email")
    private String paypalEmail;

    private String role;
}
