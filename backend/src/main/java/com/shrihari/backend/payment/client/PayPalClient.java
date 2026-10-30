package com.shrihari.backend.payment.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shrihari.backend.common.CurrencyUtils;
import com.shrihari.backend.payment.config.PayPalProperties;
import com.shrihari.backend.payment.dto.CaptureOrderResponse;
import com.shrihari.backend.payment.dto.CreateOrderResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class PayPalClient {

    private final PayPalProperties payPalProperties;
    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    // In-memory OAuth2 token cache
    private String cachedAccessToken;
    private Instant tokenExpiry = Instant.MIN;

    // Cache of mock orders created during mock mode
    private final Map<String, MockOrderRecord> mockOrders = new HashMap<>();

    private record MockOrderRecord(String orderId, String customId, long amountCents, String currency) {}

    /**
     * Retrieves or refreshes OAuth2 Bearer token from PayPal.
     */
    public synchronized String getAccessToken() {
        if (payPalProperties.isMock()) {
            return "mock_access_token_tripsheriff";
        }

        if (cachedAccessToken != null && Instant.now().isBefore(tokenExpiry.minusSeconds(60))) {
            return cachedAccessToken;
        }

        String auth = payPalProperties.getClientId() + ":" + payPalProperties.getClientSecret();
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(payPalProperties.getBaseUrl() + "/v1/oauth2/token"))
                .header("Authorization", "Basic " + encodedAuth)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials"))
                .timeout(Duration.ofSeconds(10))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                JsonNode root = objectMapper.readTree(response.body());
                cachedAccessToken = root.path("access_token").asText();
                int expiresIn = root.path("expires_in").asInt(32400); // default 9 hours
                tokenExpiry = Instant.now().plusSeconds(expiresIn);
                log.info("Successfully fetched new PayPal OAuth token, expires in {} seconds", expiresIn);
                return cachedAccessToken;
            } else {
                throw new IllegalStateException("Failed to get PayPal access token: HTTP " + response.statusCode() + " " + response.body());
            }
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error connecting to PayPal OAuth endpoint: " + e.getMessage(), e);
        }
    }

    /**
     * Creates a PayPal Order v2 according to Contract 3 (intent: CAPTURE).
     */
    public CreateOrderResponse createOrder(
            long amountCents,
            String currency,
            String customId,
            String description) {

        String formattedAmount = CurrencyUtils.centsToFormattedString(amountCents);

        if (payPalProperties.isMock()) {
            String mockOrderId = "5O" + UUID.randomUUID().toString().replace("-", "").substring(0, 15).toUpperCase();
            String mockApproveUrl = "https://www.sandbox.paypal.com/checkoutnow?token=" + mockOrderId;
            mockOrders.put(mockOrderId, new MockOrderRecord(mockOrderId, customId, amountCents, currency));

            log.info("[MOCK PAYPAL] Created order {} for {} {} (customId: {})", mockOrderId, formattedAmount, currency, customId);
            return CreateOrderResponse.builder()
                    .orderId(mockOrderId)
                    .approveUrl(mockApproveUrl)
                    .status("CREATED")
                    .customId(customId)
                    .amountCents(amountCents)
                    .formattedAmount(formattedAmount)
                    .build();
        }

        String token = getAccessToken();
        String returnUrl = payPalProperties.getAppBaseUrl() + "/api/payment/success";
        String cancelUrl = payPalProperties.getAppBaseUrl() + "/api/payment/cancel";

        // Modern PayPal Orders v2 payload with payment_source.paypal.experience_context
        Map<String, Object> amountMap = Map.of(
                "currency_code", currency,
                "value", formattedAmount
        );

        Map<String, Object> purchaseUnit = Map.of(
                "reference_id", customId,
                "description", description,
                "custom_id", customId,
                "amount", amountMap
        );

        Map<String, Object> experienceContext = Map.of(
                "brand_name", payPalProperties.getBrandName(),
                "locale", "en-US",
                "landing_page", "LOGIN",
                "user_action", "PAY_NOW",
                "return_url", returnUrl,
                "cancel_url", cancelUrl
        );

        Map<String, Object> payload = Map.of(
                "intent", "CAPTURE",
                "purchase_units", List.of(purchaseUnit),
                "payment_source", Map.of("paypal", Map.of("experience_context", experienceContext))
        );

        try {
            String jsonPayload = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(payPalProperties.getBaseUrl() + "/v2/checkout/orders"))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "return=representation")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                JsonNode root = objectMapper.readTree(response.body());
                String orderId = root.path("id").asText();
                String status = root.path("status").asText();

                String approveUrl = null;
                JsonNode linksNode = root.path("links");
                if (linksNode.isArray()) {
                    for (JsonNode link : linksNode) {
                        String rel = link.path("rel").asText();
                        if ("approve".equalsIgnoreCase(rel) || "payer-action".equalsIgnoreCase(rel)) {
                            approveUrl = link.path("href").asText();
                            break;
                        }
                    }
                }

                if (approveUrl == null) {
                    approveUrl = "https://www.sandbox.paypal.com/checkoutnow?token=" + orderId;
                }

                log.info("Created real PayPal Sandbox order {} with approve url {}", orderId, approveUrl);
                return CreateOrderResponse.builder()
                        .orderId(orderId)
                        .approveUrl(approveUrl)
                        .status(status)
                        .customId(customId)
                        .amountCents(amountCents)
                        .formattedAmount(formattedAmount)
                        .build();
            } else {
                throw new IllegalStateException("Failed to create PayPal order: HTTP " + response.statusCode() + " " + response.body());
            }
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error communicating with PayPal Orders API: " + e.getMessage(), e);
        }
    }

    /**
     * Executes the mandatory two-step capture call: POST /v2/checkout/orders/{id}/capture
     */
    public CaptureOrderResponse captureOrder(String orderId) {
        if (payPalProperties.isMock() || mockOrders.containsKey(orderId)) {
            MockOrderRecord mock = mockOrders.get(orderId);
            String customId = (mock != null) ? mock.customId() : "mock_trip|mock_debtor|mock_exp";
            long amountCents = (mock != null) ? mock.amountCents() : 8000L;
            String captureId = "CAP_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();

            log.info("[MOCK PAYPAL] Captured order {} (captureId: {})", orderId, captureId);
            return CaptureOrderResponse.builder()
                    .orderId(orderId)
                    .captureId(captureId)
                    .status("COMPLETED")
                    .customId(customId)
                    .amountCents(amountCents)
                    .payerEmail("mock.buyer@personal.example.com")
                    .settledAt(Instant.now())
                    .build();
        }

        String token = getAccessToken();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(payPalProperties.getBaseUrl() + "/v2/checkout/orders/" + orderId + "/capture"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{}"))
                .timeout(Duration.ofSeconds(10))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                JsonNode root = objectMapper.readTree(response.body());
                String status = root.path("status").asText();

                String captureId = null;
                String customId = null;
                long amountCents = 0L;

                JsonNode purchaseUnits = root.path("purchase_units");
                if (purchaseUnits.isArray() && !purchaseUnits.isEmpty()) {
                    JsonNode pu = purchaseUnits.get(0);
                    customId = pu.path("custom_id").asText();

                    JsonNode captures = pu.path("payments").path("captures");
                    if (captures.isArray() && !captures.isEmpty()) {
                        JsonNode cap = captures.get(0);
                        captureId = cap.path("id").asText();
                        String valStr = cap.path("amount").path("value").asText();
                        amountCents = CurrencyUtils.parseDollarsToCents(valStr);
                    }
                }

                String payerEmail = root.path("payer").path("email_address").asText();

                log.info("Successfully captured PayPal order {} with status {}", orderId, status);
                return CaptureOrderResponse.builder()
                        .orderId(orderId)
                        .captureId(captureId)
                        .status(status)
                        .customId(customId)
                        .amountCents(amountCents)
                        .payerEmail(payerEmail)
                        .settledAt(Instant.now())
                        .build();
            } else {
                throw new IllegalStateException("Failed to capture PayPal order: HTTP " + response.statusCode() + " " + response.body());
            }
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error communicating with PayPal Capture API: " + e.getMessage(), e);
        }
    }
}
