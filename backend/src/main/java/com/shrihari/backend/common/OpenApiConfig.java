package com.shrihari.backend.common;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI tripSheriffOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("TripSheriff AI — Group Expense & PayPal Settlement API")
                        .description("""
                                **TripSheriff AI** is an autonomous group travel financial coordinator for the PayPal AI Hackathon 2026.
                                
                                Key Modules:
                                - **Double-Entry Ledger & Debt Graph**: Integer-cent precision, deterministic remainder distribution, and Bipartite Minimum Cash Flow debt simplification ($N-1$ optimal settlement transactions).
                                - **PayPal Orders API v2**: Two-step capture flow (`/create-order`, `/success`, `/capture/{orderId}`) with Contract 3 `custom_id` encoding and Auto-Mock fallback.
                                - **PayPal Batch Payouts API**: Multi-recipient disbursement (`/payout/proposal`, `/payout/confirm`) with strict `PayPal-Request-Id` idempotency protection.
                                - **Environment Time-Warp**: Advance virtual trip clock (`/sim-time`) to simulate debt aging in seconds.
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("TripSheriff Engineering")
                                .url("https://github.com/saroshkumar-ops/PayPal-Hack"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Local Development Server")
                ));
    }
}
