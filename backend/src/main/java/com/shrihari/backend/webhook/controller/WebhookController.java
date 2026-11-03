package com.shrihari.backend.webhook.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.shrihari.backend.webhook.dto.WebhookProcessResult;
import com.shrihari.backend.webhook.service.EventBroadcaster;
import com.shrihari.backend.webhook.service.WebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@Tag(name = "Webhooks", description = "PayPal Webhook signature verification, event ingestion, and real-time SSE event streaming (Task E)")
@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WebhookController {

    private final WebhookService webhookService;
    private final EventBroadcaster eventBroadcaster;

    /**
     * Webhook Ingestion Listener:
     * POST /api/paypal/webhook
     * Validates transmission signatures and drives the real-time celebration feedback loop.
     */
    @Operation(summary = "PayPal Webhook Listener", description = "Verifies PayPal transmission headers and processes PAYMENT.CAPTURE.COMPLETED, CHECKOUT.ORDER.APPROVED, and PAYOUTSBATCH.SUCCESS events")
    @PostMapping(value = "/paypal/webhook", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> receiveWebhook(
            @RequestHeader Map<String, String> headers,
            @RequestBody String rawPayload) {

        log.info("Received incoming PayPal webhook notification");
        try {
            WebhookProcessResult result = webhookService.processWebhook(headers, rawPayload);
            return ResponseEntity.ok(result);
        } catch (SecurityException e) {
            log.warn("Webhook signature verification failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "status", "REJECTED",
                    "error", "Invalid PayPal transmission signature"
            ));
        } catch (Exception e) {
            log.error("Error processing PayPal webhook: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "ERROR",
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Trip Real-Time Event Stream:
     * GET /api/trips/{tripId}/events
     * Provides Server-Sent Events (SSE) for Telegram bots, web simulators, and AG Grid dashboard row flashes.
     */
    @Operation(summary = "Subscribe to Trip Real-Time Events", description = "Server-Sent Events (SSE) stream broadcasting instant payment settlement celebrations and payout confirmations")
    @GetMapping(value = "/trips/{tripId}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeTripEvents(@PathVariable String tripId) {
        log.info("Client subscribed to SSE event stream for trip {}", tripId);
        return eventBroadcaster.subscribe(tripId);
    }

    /**
     * Global Real-Time Event Stream:
     * GET /api/events
     * Provides Server-Sent Events (SSE) across all trips for judge simulator and admin dashboards.
     */
    @Operation(summary = "Subscribe to Global Events", description = "Global Server-Sent Events (SSE) stream for all group trips")
    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeGlobalEvents() {
        log.info("Client subscribed to global SSE event stream");
        return eventBroadcaster.subscribeGlobal();
    }
}
