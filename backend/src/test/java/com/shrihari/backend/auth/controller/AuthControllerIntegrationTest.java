package com.shrihari.backend.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shrihari.backend.auth.dto.LoginRequest;
import com.shrihari.backend.auth.dto.RegisterRequest;
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
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class AuthControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    @DisplayName("Auth Flow: Register new user, receive JWT, login, and verify profile")
    void testAuthLifecycle() throws Exception {
        String email = "sarah.prod" + System.currentTimeMillis() + "@example.com";

        // 1. Register
        RegisterRequest registerReq = RegisterRequest.builder()
                .email(email)
                .password("Password123!")
                .name("Sarah Connor")
                .handle("@sarah_c")
                .paypalEmail("sarah.organizer@personal.example.com")
                .build();

        String registerResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.access_token", notNullValue()))
                .andExpect(jsonPath("$.token_type", is("Bearer")))
                .andExpect(jsonPath("$.email", is(email)))
                .andExpect(jsonPath("$.name", is("Sarah Connor")))
                .andReturn().getResponse().getContentAsString();

        String token = objectMapper.readTree(registerResponse).get("access_token").asText();

        // 2. Login
        LoginRequest loginReq = LoginRequest.builder()
                .email(email)
                .password("Password123!")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token", notNullValue()))
                .andExpect(jsonPath("$.email", is(email)));

        // 3. Check /api/auth/me with Bearer Token
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is(email)))
                .andExpect(jsonPath("$.handle", is("@sarah_c")));
    }
}
