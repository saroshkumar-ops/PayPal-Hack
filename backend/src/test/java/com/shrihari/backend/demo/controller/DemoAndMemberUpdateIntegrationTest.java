package com.shrihari.backend.demo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shrihari.backend.member.dto.MemberUpdateRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class DemoAndMemberUpdateIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    }

    @Test
    @DisplayName("One-Click Demo Seeder: POST /api/demo/seed returns trip, members, expenses, and ledger")
    void testDemoSeedEndpoint() throws Exception {
        mockMvc.perform(post("/api/demo/seed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("successfully seeded")))
                .andExpect(jsonPath("$.trip.trip_id", is("trip_bali_2026")))
                .andExpect(jsonPath("$.member_ids", hasSize(4)))
                .andExpect(jsonPath("$.members", hasSize(4)))
                .andExpect(jsonPath("$.expenses", hasSize(2)))
                .andExpect(jsonPath("$.ledger.trip_id", is("trip_bali_2026")))
                .andExpect(jsonPath("$.ledger.simplified_settlements", notNullValue()));
    }

    @Test
    @DisplayName("Update Member Details: PUT /api/trips/{tripId}/members/{userId} updates email, role, and roast consent")
    void testUpdateMemberEndpoint() throws Exception {
        // First ensure demo is seeded
        mockMvc.perform(post("/api/demo/seed"))
                .andExpect(status().isOk());

        // Update Alex's roast consent from SPICY to NO_ROAST and PayPal email
        MemberUpdateRequest updateReq = MemberUpdateRequest.builder()
                .name("Alex H. (Updated)")
                .paypalEmail("alex.hunter.new@personal.example.com")
                .role("ORGANIZER")
                .roastConsent("NO_ROAST")
                .build();

        mockMvc.perform(put("/api/trips/trip_bali_2026/members/user_alex")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user_id", is("user_alex")))
                .andExpect(jsonPath("$.name", is("Alex H. (Updated)")))
                .andExpect(jsonPath("$.paypal_email", is("alex.hunter.new@personal.example.com")))
                .andExpect(jsonPath("$.role", is("organizer")))
                .andExpect(jsonPath("$.roast_consent", is("NO_ROAST")));

        // Verify member list reflects changes
        mockMvc.perform(get("/api/trips/trip_bali_2026/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.user_id == 'user_alex')].roast_consent", contains("NO_ROAST")));
    }
}

