package com.shrihari.backend.payment.config;

import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "paypal")
public class PayPalProperties {

    private String clientId;

    private String clientSecret;

    private String mode = "sandbox";

    private String baseUrl = "https://api-m.sandbox.paypal.com";

    private boolean mockMode = false;

    private String brandName = "TripSheriff AI";

    @Value("${app.base-url:http://localhost:8080}")
    private String appBaseUrl;

    /**
     * Determines whether to operate in mock mode.
     * Returns true if mockMode flag is explicitly set or if credentials are empty.
     */
    public boolean isMock() {
        return mockMode || clientId == null || clientId.trim().isEmpty()
                || clientSecret == null || clientSecret.trim().isEmpty();
    }
}
