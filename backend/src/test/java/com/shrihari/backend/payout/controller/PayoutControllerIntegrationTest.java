package com.shrihari.backend.payout.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shrihari.backend.expense.dto.ExpenseCreateRequest;
import com.shrihari.backend.expense.dto.ExpenseResponse;
import com.shrihari.backend.ledger.model.Settlement;
import com.shrihari.backend.ledger.model.SettlementStatus;
import com.shrihari.backend.ledger.repository.SettlementRepository;
import com.shrihari.backend.member.dto.MemberCreateRequest;
import com.shrihari.backend.payment.dto.CreateOrderRequest;
import com.shrihari.backend.payout.dto.PayoutConfirmRequest;
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
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class PayoutControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SettlementRepository settlementRepository;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    }

    @Test
    @DisplayName("Task D Full Flow: Proposal, Multi-Recipient Batch Payout, Idempotency Protection, and Ledger Settlement")
    void testFullBatchPayoutLifecycle() throws Exception {
        String tripId = "trip_payout_lifecycle_test";

        // 1. Create Trip
        mockMvc.perform(post("/api/trips")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TripCreateRequest.builder()
                                .tripId(tripId)
                                .name("Bali Villa 2026")
                                .currency("USD")
                                .build())))
                .andExpect(status().isCreated());

        // 2. Add 3 Members: Sarah (Organizer), Dave (Creditor), Alex (Debtor)
        mockMvc.perform(post("/api/trips/" + tripId + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(MemberCreateRequest.builder()
                                .userId("user_sarah").name("Sarah Connor").role("ORGANIZER")
                                .paypalEmail("sarah.organizer@personal.example.com").build())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/trips/" + tripId + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(MemberCreateRequest.builder()
                                .userId("user_dave").name("Dave Miller").role("MEMBER")
                                .paypalEmail("dave.member@personal.example.com").build())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/trips/" + tripId + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(MemberCreateRequest.builder()
                                .userId("user_alex").name("Alex Hunter").role("MEMBER")
                                .paypalEmail("alex.travels@personal.example.com").build())))
                .andExpect(status().isCreated());

        // 3. Sarah fronts $200 Villa expense split equally with Alex ($100 each)
        MvcResult exp1Result = mockMvc.perform(post("/api/trips/" + tripId + "/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ExpenseCreateRequest.builder()
                                .expenseId("exp_villa_01")
                                .paidBy("user_sarah")
                                .amountCents(20000L)
                                .description("Sunset Villa Deposit")
                                .splitType("EQUAL")
                                .splitWithUserIds(List.of("user_sarah", "user_alex"))
                                .build())))
                .andExpect(status().isCreated())
                .andReturn();

        // 4. Dave fronts $60 Boat Tour expense split equally with Alex ($30 each)
        MvcResult exp2Result = mockMvc.perform(post("/api/trips/" + tripId + "/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ExpenseCreateRequest.builder()
                                .expenseId("exp_boat_01")
                                .paidBy("user_dave")
                                .amountCents(6000L)
                                .description("Catamaran Tour")
                                .splitType("EQUAL")
                                .splitWithUserIds(List.of("user_dave", "user_alex"))
                                .build())))
                .andExpect(status().isCreated())
                .andReturn();

        // 5. Alex pays Sarah's split ($100 = 10000 cents) via Orders API & Capture
        MvcResult orderRes1 = mockMvc.perform(post("/api/payment/create-order")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CreateOrderRequest.builder()
                                .tripId(tripId)
                                .debtorId("user_alex")
                                .expenseId("exp_villa_01")
                                .build())))
                .andExpect(status().isCreated())
                .andReturn();
        String orderId1 = objectMapper.readTree(orderRes1.getResponse().getContentAsString()).path("order_id").asText();
        mockMvc.perform(post("/api/payment/capture/" + orderId1)).andExpect(status().isOk());

        // 6. Alex pays Dave's split ($30 = 3000 cents) via Orders API & Capture
        MvcResult orderRes2 = mockMvc.perform(post("/api/payment/create-order")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CreateOrderRequest.builder()
                                .tripId(tripId)
                                .debtorId("user_alex")
                                .expenseId("exp_boat_01")
                                .build())))
                .andExpect(status().isCreated())
                .andReturn();
        String orderId2 = objectMapper.readTree(orderRes2.getResponse().getContentAsString()).path("order_id").asText();
        mockMvc.perform(post("/api/payment/capture/" + orderId2)).andExpect(status().isOk());

        // Verify Platform Escrow is $130.00 (13000 cents)
        mockMvc.perform(get("/api/trips/" + tripId + "/ledger"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.platform_escrow_cents", is(13000)))
                .andExpect(jsonPath("$.net_balances_cents.user_sarah", is(10000)))
                .andExpect(jsonPath("$.net_balances_cents.user_dave", is(3000)))
                .andExpect(jsonPath("$.net_balances_cents.user_alex", is(0)));

        // 7. Human-in-the-Loop Proposal: GET /api/trips/{tripId}/payout/proposal
        MvcResult propResult = mockMvc.perform(get("/api/trips/" + tripId + "/payout/proposal"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trip_id", is(tripId)))
                .andExpect(jsonPath("$.requires_confirmation", is(true)))
                .andExpect(jsonPath("$.total_payout_cents", is(13000)))
                .andExpect(jsonPath("$.formatted_total_payout", is("130.00")))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.idempotency_key", notNullValue()))
                .andReturn();

        String idempotencyKey = objectMapper.readTree(propResult.getResponse().getContentAsString())
                .path("idempotency_key").asText();

        // 8. Organizer confirms Batch Payout to 2 distinct sandbox accounts (Sarah & Dave)
        PayoutConfirmRequest confirmReq = PayoutConfirmRequest.builder()
                .idempotencyKey(idempotencyKey)
                .emailSubject("TripSheriff: Bali Villa 2026 Reimbursement")
                .emailMessage("All expenses settled! Funds have arrived.")
                .build();

        MvcResult payoutResult = mockMvc.perform(post("/api/trips/" + tripId + "/payout/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payout_batch_id", startsWith("5U")))
                .andExpect(jsonPath("$.batch_status", is("SUCCESS")))
                .andExpect(jsonPath("$.settled_recipients_count", is(2)))
                .andExpect(jsonPath("$.total_disbursed_cents", is(13000)))
                .andExpect(jsonPath("$.formatted_total_disbursed", is("130.00")))
                .andExpect(jsonPath("$.is_idempotent_replay", is(false)))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andReturn();

        String payoutBatchId = objectMapper.readTree(payoutResult.getResponse().getContentAsString())
                .path("payout_batch_id").asText();

        // 9. Verify Settlement entities in DB
        List<Settlement> settlements = settlementRepository.findByIdempotencyKey(idempotencyKey);
        assertEquals(2, settlements.size(), "Should have exactly 2 settlement records for 2 creditors");
        for (Settlement s : settlements) {
            assertEquals(SettlementStatus.COMPLETED, s.getStatus());
            assertEquals(payoutBatchId, s.getPaypalPayoutBatchId());
            assertEquals(idempotencyKey, s.getIdempotencyKey());
            assertEquals("PLATFORM_ESCROW", s.getFromUserId());
            assertTrue(s.getToUserId().equals("user_sarah") || s.getToUserId().equals("user_dave"));
        }

        // 10. Verify Post-Payout Ledger: Sarah and Dave balances are zeroed, and platform escrow is zeroed!
        mockMvc.perform(get("/api/trips/" + tripId + "/ledger"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.platform_escrow_cents", is(0)))
                .andExpect(jsonPath("$.net_balances_cents.user_sarah", is(0)))
                .andExpect(jsonPath("$.net_balances_cents.user_dave", is(0)))
                .andExpect(jsonPath("$.net_balances_cents.user_alex", is(0)));

        // 11. Test Idempotency Protection: Repeat POST /confirm with the exact same idempotencyKey
        mockMvc.perform(post("/api/trips/" + tripId + "/payout/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payout_batch_id", is(payoutBatchId)))
                .andExpect(jsonPath("$.is_idempotent_replay", is(true)))
                .andExpect(jsonPath("$.settled_recipients_count", is(2)))
                .andExpect(jsonPath("$.message", containsString("Idempotent replay")));

        // Assert no duplicate settlements were inserted
        List<Settlement> settlementsAfter = settlementRepository.findByIdempotencyKey(idempotencyKey);
        assertEquals(2, settlementsAfter.size(), "Duplicate settlements must not be created on repeated clicks");

        // 12. Test Payout Batch Status check
        mockMvc.perform(get("/api/trips/" + tripId + "/payout/" + payoutBatchId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payout_batch_id", is(payoutBatchId)))
                .andExpect(jsonPath("$.batch_status", is("SUCCESS")));
    }
}
