package com.shrihari.backend.payment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shrihari.backend.expense.dto.ExpenseCreateRequest;
import com.shrihari.backend.expense.dto.ExpenseResponse;
import com.shrihari.backend.expense.model.PaymentStatus;
import com.shrihari.backend.expense.repository.ExpenseSplitRepository;
import com.shrihari.backend.member.dto.MemberCreateRequest;
import com.shrihari.backend.payment.dto.CreateOrderRequest;
import com.shrihari.backend.trip.dto.SimTimeRequest;
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

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class PaymentControllerIntegrationTest {

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
    @DisplayName("Task C Order Creation & Two-Step Capture: Full PayPal Orders Lifecycle")
    void testPayPalOrderLifecycle() throws Exception {
        String tripId = "trip_paypal_order_test";

        // 1. Create Trip
        mockMvc.perform(post("/api/trips")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TripCreateRequest.builder()
                                .tripId(tripId)
                                .name("PayPal Order Test Trip")
                                .currency("USD")
                                .build())))
                .andExpect(status().isCreated());

        // 2. Add Sarah (Organizer) and Alex (Debtor)
        mockMvc.perform(post("/api/trips/" + tripId + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(MemberCreateRequest.builder()
                                .userId("user_sarah").name("Sarah").role("ORGANIZER").build())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/trips/" + tripId + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(MemberCreateRequest.builder()
                                .userId("user_alex").name("Alex").role("MEMBER").build())))
                .andExpect(status().isCreated());

        // 3. Sarah logs $160 dinner split with Alex ($80 each = 8000 cents)
        MvcResult expResult = mockMvc.perform(post("/api/trips/" + tripId + "/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ExpenseCreateRequest.builder()
                                .expenseId("exp_dinner_01")
                                .paidBy("user_sarah")
                                .amountCents(16000L)
                                .description("Sunset Seafood Dinner")
                                .splitType("EQUAL")
                                .splitWithUserIds(List.of("user_sarah", "user_alex"))
                                .build())))
                .andExpect(status().isCreated())
                .andReturn();

        ExpenseResponse expenseResponse = objectMapper.readValue(
                expResult.getResponse().getContentAsString(), ExpenseResponse.class);
        String expenseId = expenseResponse.getExpenseId();

        // 4. Create PayPal Order for Alex's split (POST /api/payment/create-order)
        CreateOrderRequest orderReq = CreateOrderRequest.builder()
                .tripId(tripId)
                .debtorId("user_alex")
                .expenseId(expenseId)
                .build();

        MvcResult orderResult = mockMvc.perform(post("/api/payment/create-order")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.order_id", notNullValue()))
                .andExpect(jsonPath("$.approve_url", containsString("sandbox.paypal.com")))
                .andExpect(jsonPath("$.status", is("CREATED")))
                .andExpect(jsonPath("$.amount_cents", is(8000)))
                .andExpect(jsonPath("$.formatted_amount", is("80.00")))
                .andExpect(jsonPath("$.custom_id", is(tripId + "|user_alex|" + expenseId)))
                .andReturn();

        String orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString())
                .path("order_id").asText();

        // Verify ExpenseSplit was updated with paypalOrderId and paymentUrl
        var alexSplitOpt = splitRepository.findByPaypalOrderId(orderId);
        assertTrue(alexSplitOpt.isPresent(), "ExpenseSplit should be linked to paypalOrderId");
        assertEquals(PaymentStatus.PENDING, alexSplitOpt.get().getPaidStatus());
        assertNotNull(alexSplitOpt.get().getPaymentUrl());

        // 5. Test Two-Step Capture via Direct Endpoint (POST /api/payment/capture/{orderId})
        mockMvc.perform(post("/api/payment/capture/" + orderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.order_id", is(orderId)))
                .andExpect(jsonPath("$.capture_id", notNullValue()));

        // Verify split is now SETTLED in DB
        var settledSplit = splitRepository.findByPaypalOrderId(orderId).orElseThrow();
        assertEquals(PaymentStatus.SETTLED, settledSplit.getPaidStatus());
        assertNotNull(settledSplit.getSettledAt());

        // 6. Verify Ledger reflects zero balance for Alex, preserved credit for Sarah, and $80 in platform escrow
        mockMvc.perform(get("/api/trips/" + tripId + "/ledger"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.net_balances_cents.user_alex", is(0)))
                .andExpect(jsonPath("$.net_balances_cents.user_sarah", is(8000)))
                .andExpect(jsonPath("$.platform_escrow_cents", is(8000)));
    }

    @Test
    @DisplayName("Primary Redirect Path: GET /api/payment/success executes capture and renders celebration HTML")
    void testRedirectCapturePathHtml() throws Exception {
        String tripId = "trip_redirect_test";

        mockMvc.perform(post("/api/trips")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TripCreateRequest.builder()
                                .tripId(tripId).name("Redirect Trip").build())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/trips/" + tripId + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(MemberCreateRequest.builder()
                                .userId("payer_01").name("Alice").role("ORGANIZER").build())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/trips/" + tripId + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(MemberCreateRequest.builder()
                                .userId("debtor_01").name("Bob").role("MEMBER").build())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/trips/" + tripId + "/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ExpenseCreateRequest.builder()
                                .expenseId("exp_redirect")
                                .paidBy("payer_01")
                                .amountCents(6000L)
                                .description("Snacks")
                                .splitType("EQUAL")
                                .splitWithUserIds(List.of("payer_01", "debtor_01"))
                                .build())))
                .andExpect(status().isCreated());

        // Create Order
        MvcResult orderRes = mockMvc.perform(post("/api/payment/create-order")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CreateOrderRequest.builder()
                                .tripId(tripId)
                                .debtorId("debtor_01")
                                .expenseId("exp_redirect")
                                .build())))
                .andExpect(status().isCreated())
                .andReturn();

        String token = objectMapper.readTree(orderRes.getResponse().getContentAsString()).path("order_id").asText();

        // Buyer approves on PayPal and is redirected to return_url: GET /api/payment/success?token=...
        mockMvc.perform(get("/api/payment/success?token=" + token))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string(containsString("Payment Cleared!")))
                .andExpect(content().string(containsString("SETTLED")));

        // Verify split is SETTLED
        var split = splitRepository.findByPaypalOrderId(token).orElseThrow();
        assertEquals(PaymentStatus.SETTLED, split.getPaidStatus());
    }

    @Test
    @DisplayName("Environment Time-Warp Setting: POST /api/trips/{tripId}/sim-time advances virtual debt age")
    void testTimeWarpSetting() throws Exception {
        String tripId = "trip_timewarp_test";

        mockMvc.perform(post("/api/trips")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TripCreateRequest.builder()
                                .tripId(tripId).name("Time Warp Trip").build())))
                .andExpect(status().isCreated());

        // Fast-forward by 24 hours
        mockMvc.perform(post("/api/trips/" + tripId + "/sim-time")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(SimTimeRequest.builder().hoursToAdvance(24L).build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trip_id", is(tripId)))
                .andExpect(jsonPath("$.total_hours_advanced", is(24)))
                .andExpect(jsonPath("$.effective_now", notNullValue()))
                .andExpect(jsonPath("$.message", containsString("+24 hours")));

        // Fast-forward by another 48 hours (total 72 hours)
        mockMvc.perform(post("/api/trips/" + tripId + "/sim-time")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(SimTimeRequest.builder().hoursToAdvance(48L).build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total_hours_advanced", is(72)));
    }
}
