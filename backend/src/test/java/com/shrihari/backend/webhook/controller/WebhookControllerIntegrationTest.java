package com.shrihari.backend.webhook.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shrihari.backend.expense.dto.ExpenseCreateRequest;
import com.shrihari.backend.expense.dto.ExpenseResponse;
import com.shrihari.backend.expense.model.PaymentStatus;
import com.shrihari.backend.expense.repository.ExpenseSplitRepository;
import com.shrihari.backend.member.dto.MemberCreateRequest;
import com.shrihari.backend.payment.dto.CreateOrderRequest;
import com.shrihari.backend.trip.dto.TripCreateRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class WebhookControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ExpenseSplitRepository splitRepository;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    }

    @Test
    @DisplayName("Task E Benchmark: Valid PAYMENT.CAPTURE.COMPLETED Webhook settles debt and triggers celebration")
    void testValidPaymentCaptureWebhook() throws Exception {
        String tripId = "trip_webhook_test_01";

        // 1. Setup Trip & Members
        mockMvc.perform(post("/api/trips")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TripCreateRequest.builder()
                                .tripId(tripId).name("Webhook Trip").build())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/trips/" + tripId + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(MemberCreateRequest.builder()
                                .userId("wh_sarah").name("Sarah").role("ORGANIZER").build())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/trips/" + tripId + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(MemberCreateRequest.builder()
                                .userId("wh_alex").name("Alex").role("MEMBER").build())))
                .andExpect(status().isCreated());

        // 2. Sarah fronts $160 dinner split with Alex ($80 owed)
        MvcResult expResult = mockMvc.perform(post("/api/trips/" + tripId + "/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ExpenseCreateRequest.builder()
                                .expenseId("exp_wh_01")
                                .paidBy("wh_sarah")
                                .amountCents(16000L)
                                .description("Sunset Seafood")
                                .splitType("EQUAL")
                                .splitWithUserIds(List.of("wh_sarah", "wh_alex"))
                                .build())))
                .andExpect(status().isCreated())
                .andReturn();

        // 3. Construct PayPal PAYMENT.CAPTURE.COMPLETED Webhook payload
        Map<String, Object> webhookPayload = Map.of(
                "id", "WH-EVT-99881122",
                "event_type", "PAYMENT.CAPTURE.COMPLETED",
                "create_time", "2026-10-31T14:30:00Z",
                "resource", Map.of(
                        "id", "CAP-MOCK-99112233",
                        "custom_id", tripId + "|wh_alex|exp_wh_01",
                        "status", "COMPLETED",
                        "amount", Map.of(
                                "value", "80.00",
                                "currency_code", "USD"
                        )
                )
        );

        // 4. Send Webhook with valid transmission headers
        mockMvc.perform(post("/api/paypal/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("paypal-transmission-id", "tx_99182377")
                        .header("paypal-transmission-time", "2026-10-31T14:30:05Z")
                        .header("paypal-transmission-sig", "VALID_MOCK_SIGNATURE_OK")
                        .header("paypal-cert-url", "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1")
                        .header("paypal-auth-algo", "SHA256withRSA")
                        .content(objectMapper.writeValueAsString(webhookPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUCCESS")))
                .andExpect(jsonPath("$.event_type", is("PAYMENT.CAPTURE.COMPLETED")))
                .andExpect(jsonPath("$.processed", is(true)))
                .andExpect(jsonPath("$.message", containsString("HALLELUJAH! Alex has settled $80.00")));

        // 5. Verify database split is now SETTLED
        var split = splitRepository.findByExpenseIdAndUserId("exp_wh_01", "wh_alex").orElseThrow();
        assertEquals(PaymentStatus.SETTLED, split.getPaidStatus());
        assertNotNull(split.getSettledAt());

        // 6. Verify Ledger reflects zero balance for Alex and $80 in platform escrow
        mockMvc.perform(get("/api/trips/" + tripId + "/ledger"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.net_balances_cents.wh_alex", is(0)))
                .andExpect(jsonPath("$.net_balances_cents.wh_sarah", is(8000)))
                .andExpect(jsonPath("$.platform_escrow_cents", is(8000)));
    }

    @Test
    @DisplayName("Task E Benchmark: Forged / tampered webhook signatures are rejected with 400 Bad Request")
    void testForgedSignatureRejection() throws Exception {
        Map<String, Object> forgedPayload = Map.of(
                "id", "WH-EVT-FORGED",
                "event_type", "PAYMENT.CAPTURE.COMPLETED",
                "resource", Map.of("id", "CAP-FAKE")
        );

        mockMvc.perform(post("/api/paypal/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("paypal-transmission-id", "tx_forged_01")
                        .header("paypal-transmission-time", "2026-10-31T14:35:00Z")
                        .header("paypal-transmission-sig", "FORGED_TAMPERED_SIG")
                        .header("paypal-cert-url", "https://fake.cert.url")
                        .header("paypal-auth-algo", "SHA256withRSA")
                        .content(objectMapper.writeValueAsString(forgedPayload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is("REJECTED")))
                .andExpect(jsonPath("$.error", containsString("Invalid PayPal transmission signature")));
    }

    @Test
    @DisplayName("Task E Benchmark: CHECKOUT.ORDER.APPROVED triggers automatic two-step capture fallback")
    void testOrderApprovedWebhookFallback() throws Exception {
        String tripId = "trip_order_approved_fallback";

        mockMvc.perform(post("/api/trips")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TripCreateRequest.builder()
                                .tripId(tripId).name("Fallback Trip").build())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/trips/" + tripId + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(MemberCreateRequest.builder()
                                .userId("user_p1").name("P1").role("ORGANIZER").build())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/trips/" + tripId + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(MemberCreateRequest.builder()
                                .userId("user_d1").name("D1").role("MEMBER").build())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/trips/" + tripId + "/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ExpenseCreateRequest.builder()
                                .expenseId("exp_appr_01")
                                .paidBy("user_p1")
                                .amountCents(4000L)
                                .description("Snacks")
                                .splitType("EQUAL")
                                .splitWithUserIds(List.of("user_p1", "user_d1"))
                                .build())))
                .andExpect(status().isCreated());

        // Create Order
        MvcResult orderRes = mockMvc.perform(post("/api/payment/create-order")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CreateOrderRequest.builder()
                                .tripId(tripId)
                                .debtorId("user_d1")
                                .expenseId("exp_appr_01")
                                .build())))
                .andExpect(status().isCreated())
                .andReturn();

        String orderId = objectMapper.readTree(orderRes.getResponse().getContentAsString()).path("order_id").asText();

        // Simulate PayPal CHECKOUT.ORDER.APPROVED Webhook
        Map<String, Object> approvedPayload = Map.of(
                "id", "WH-EVT-APPROVED-01",
                "event_type", "CHECKOUT.ORDER.APPROVED",
                "resource", Map.of("id", orderId)
        );

        mockMvc.perform(post("/api/paypal/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("paypal-transmission-sig", "VALID_SIG")
                        .content(objectMapper.writeValueAsString(approvedPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUCCESS")))
                .andExpect(jsonPath("$.event_type", is("CHECKOUT.ORDER.APPROVED")))
                .andExpect(jsonPath("$.processed", is(true)));

        // Verify split is now SETTLED through fallback capture
        var split = splitRepository.findByExpenseIdAndUserId("exp_appr_01", "user_d1").orElseThrow();
        assertEquals(PaymentStatus.SETTLED, split.getPaidStatus());
    }

    @Test
    @DisplayName("Task E Benchmark: PAYOUTSBATCH.SUCCESS notifies group trip members")
    void testPayoutsBatchSuccessWebhook() throws Exception {
        Map<String, Object> payoutPayload = Map.of(
                "id", "WH-EVT-PAYOUT-01",
                "event_type", "PAYOUTSBATCH.SUCCESS",
                "resource", Map.of(
                        "batch_header", Map.of(
                                "payout_batch_id", "5U99182312",
                                "amount", Map.of("value", "160.00", "currency", "USD"),
                                "sender_batch_header", Map.of("sender_batch_id", "batch_test_01")
                        )
                )
        );

        mockMvc.perform(post("/api/paypal/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("paypal-transmission-sig", "VALID_SIG")
                        .content(objectMapper.writeValueAsString(payoutPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUCCESS")))
                .andExpect(jsonPath("$.event_type", is("PAYOUTSBATCH.SUCCESS")))
                .andExpect(jsonPath("$.message", containsString("Batch Payout Delivered!")));
    }

    @Test
    @DisplayName("Task E Real-Time SSE: /api/trips/{tripId}/events connects to event-stream")
    void testSseStreamSubscription() throws Exception {
        mockMvc.perform(get("/api/trips/trip_sse_test/events"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM));
    }
}
