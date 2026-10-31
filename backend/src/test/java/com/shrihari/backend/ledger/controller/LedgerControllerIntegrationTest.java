package com.shrihari.backend.ledger.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shrihari.backend.expense.dto.ExpenseCreateRequest;
import com.shrihari.backend.member.dto.MemberCreateRequest;
import com.shrihari.backend.trip.dto.TripCreateRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class LedgerControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setupMockMvc() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    }

    @Test
    @DisplayName("End-to-End Contract 1 Flow: Create Trip, Members, Expense, and verify Ledger & Settlements")
    void testEndToEndContractOneFlow() throws Exception {
        String tripId = "trip_bali_2026";

        // 1. Create Trip
        TripCreateRequest tripReq = TripCreateRequest.builder()
                .tripId(tripId)
                .name("Bali Summer Trip 2026")
                .currency("USD")
                .build();

        mockMvc.perform(post("/api/trips")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tripReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.trip_id").value(tripId))
                .andExpect(jsonPath("$.currency").value("USD"));

        // 2. Add Members (Sarah, Alex, Dave)
        MemberCreateRequest sarah = MemberCreateRequest.builder()
                .userId("user_01")
                .name("Sarah")
                .handle("@sarah_c")
                .paypalEmail("sarah.organizer@personal.example.com")
                .role("ORGANIZER")
                .roastConsent("SPICY")
                .build();

        MemberCreateRequest alex = MemberCreateRequest.builder()
                .userId("user_02")
                .name("Alex")
                .handle("@alex_travels")
                .paypalEmail("alex.debtor@personal.example.com")
                .role("MEMBER")
                .roastConsent("SPICY")
                .build();

        MemberCreateRequest dave = MemberCreateRequest.builder()
                .userId("user_03")
                .name("Dave")
                .handle("@dave_k")
                .paypalEmail("dave.payer@personal.example.com")
                .role("MEMBER")
                .roastConsent("MILD")
                .build();

        mockMvc.perform(post("/api/trips/" + tripId + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sarah)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/trips/" + tripId + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(alex)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/trips/" + tripId + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dave)))
                .andExpect(status().isCreated());

        // 3. Log Expense: $240.00 (24,000 cents) "Sunset Villa Deposit" paid by Sarah
        ExpenseCreateRequest expReq = ExpenseCreateRequest.builder()
                .expenseId("exp_8821")
                .paidBy("user_01")
                .amountCents(24000L)
                .description("Sunset Villa Deposit")
                .category("LODGING")
                .splitType("EQUAL")
                .build();

        mockMvc.perform(post("/api/trips/" + tripId + "/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(expReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.expense_id").value("exp_8821"))
                .andExpect(jsonPath("$.amount_cents").value(24000))
                .andExpect(jsonPath("$.splits", hasSize(3)));

        // 4. Retrieve Ledger (GET /api/trips/{tripId}/ledger)
        mockMvc.perform(get("/api/trips/" + tripId + "/ledger"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trip_id").value(tripId))
                .andExpect(jsonPath("$.currency").value("USD"))
                .andExpect(jsonPath("$.members", hasSize(3)))
                .andExpect(jsonPath("$.expenses", hasSize(1)))
                // Verify Sarah split is SETTLED, Alex & Dave are PENDING
                .andExpect(jsonPath("$.expenses[0].splits[?(@.user_id == 'user_01')].paid_status").value("SETTLED"))
                .andExpect(jsonPath("$.expenses[0].splits[?(@.user_id == 'user_02')].paid_status").value("PENDING"))
                .andExpect(jsonPath("$.expenses[0].splits[?(@.user_id == 'user_03')].paid_status").value("PENDING"))
                // Verify Net Balances
                .andExpect(jsonPath("$.net_balances_cents.user_01").value(16000))
                .andExpect(jsonPath("$.net_balances_cents.user_02").value(-8000))
                .andExpect(jsonPath("$.net_balances_cents.user_03").value(-8000))
                // Verify Platform Escrow (0 cents initially when all splits pending)
                .andExpect(jsonPath("$.platform_escrow_cents").value(0))
                // Verify Simplified Settlements
                .andExpect(jsonPath("$.simplified_settlements", hasSize(2)))
                .andExpect(jsonPath("$.simplified_settlements[0].to_user_id").value("user_01"))
                .andExpect(jsonPath("$.simplified_settlements[0].amount_cents").value(8000))
                .andExpect(jsonPath("$.simplified_settlements[0].formatted_amount").value("80.00"))
                .andExpect(jsonPath("$.simplified_settlements[1].to_user_id").value("user_01"))
                .andExpect(jsonPath("$.simplified_settlements[1].amount_cents").value(8000))
                .andExpect(jsonPath("$.simplified_settlements[1].formatted_amount").value("80.00"));
    }

    @Test
    @DisplayName("Platform Escrow vs Direct Settlement: When Alex settles via PayPal, escrow holds $80 and Sarah's credit is preserved")
    void testPlatformEscrowWhenMemberSettlesViaPayPal() throws Exception {
        String tripId = "trip_escrow_test";

        // 1. Create Trip
        mockMvc.perform(post("/api/trips")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TripCreateRequest.builder()
                                .tripId(tripId)
                                .name("Escrow Test")
                                .currency("USD")
                                .build())))
                .andExpect(status().isCreated());

        // 2. Add Members
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

        // 3. Sarah fronts $100 for Sarah and Alex ($50 each = 5000 cents)
        mockMvc.perform(post("/api/trips/" + tripId + "/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ExpenseCreateRequest.builder()
                                .paidBy("user_sarah")
                                .amountCents(10000L)
                                .description("Dinner")
                                .splitType("EQUAL")
                                .splitWithUserIds(java.util.List.of("user_sarah", "user_alex"))
                                .build())))
                .andExpect(status().isCreated());

        // 4. Alex pays via PayPal Sandbox: mark Alex's split SETTLED
        com.shrihari.backend.expense.repository.ExpenseRepository expenseRepo =
                webApplicationContext.getBean(com.shrihari.backend.expense.repository.ExpenseRepository.class);
        var tripExpenses = expenseRepo.findByTripIdOrderByTimestampAsc(tripId);
        assertFalse(tripExpenses.isEmpty());
        var alexSplit = tripExpenses.get(0).getSplits().stream()
                .filter(s -> s.getUserId().equals("user_alex"))
                .findFirst().orElseThrow();
        com.shrihari.backend.expense.repository.ExpenseSplitRepository splitRepo =
                webApplicationContext.getBean(com.shrihari.backend.expense.repository.ExpenseSplitRepository.class);
        alexSplit.setPaidStatus(com.shrihari.backend.expense.model.PaymentStatus.SETTLED);
        splitRepo.save(alexSplit);

        // 5. Query Ledger: Alex is at 0, Sarah is STILL owed 5000, Platform Escrow has 5000!
        mockMvc.perform(get("/api/trips/" + tripId + "/ledger"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.net_balances_cents.user_alex").value(0))
                .andExpect(jsonPath("$.net_balances_cents.user_sarah").value(5000))
                .andExpect(jsonPath("$.platform_escrow_cents").value(5000));
    }
}
