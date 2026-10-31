package com.shrihari.backend.webhook.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.shrihari.backend.common.CurrencyUtils;
import com.shrihari.backend.expense.model.Expense;
import com.shrihari.backend.expense.model.ExpenseSplit;
import com.shrihari.backend.expense.model.PaymentStatus;
import com.shrihari.backend.expense.repository.ExpenseRepository;
import com.shrihari.backend.expense.repository.ExpenseSplitRepository;
import com.shrihari.backend.member.dto.MemberResponse;
import com.shrihari.backend.member.service.TripMemberService;
import com.shrihari.backend.payment.client.PayPalClient;
import com.shrihari.backend.payment.service.PaymentService;
import com.shrihari.backend.webhook.dto.CelebrationEvent;
import com.shrihari.backend.webhook.dto.WebhookProcessResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookService {

    private final PayPalClient payPalClient;
    private final ExpenseSplitRepository splitRepository;
    private final ExpenseRepository expenseRepository;
    private final TripMemberService memberService;
    private final PaymentService paymentService;
    private final EventBroadcaster eventBroadcaster;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    /**
     * Ingests, validates, and dispatches PayPal webhooks according to Contract 3.
     */
    @Transactional
    public WebhookProcessResult processWebhook(Map<String, String> headers, String rawPayload) {
        JsonNode payload;
        try {
            payload = objectMapper.readTree(rawPayload);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid JSON payload: " + e.getMessage());
        }

        // 1. Signature Verification
        boolean isValid = payPalClient.verifyWebhookSignature(headers, payload);
        if (!isValid) {
            log.warn("Rejected webhook: Invalid PayPal transmission signature");
            throw new SecurityException("Invalid PayPal webhook signature");
        }

        String eventType = payload.path("event_type").asText();
        String eventId = payload.path("id").asText();
        JsonNode resource = payload.path("resource");

        log.info("Processing verified PayPal webhook event: {} (id: {})", eventType, eventId);

        switch (eventType) {
            case "PAYMENT.CAPTURE.COMPLETED" -> {
                return handleCaptureCompleted(eventId, resource);
            }
            case "CHECKOUT.ORDER.APPROVED" -> {
                return handleOrderApproved(eventId, resource);
            }
            case "PAYOUTSBATCH.SUCCESS" -> {
                return handlePayoutsBatchSuccess(eventId, resource);
            }
            default -> {
                log.info("Acknowledged unhandled PayPal webhook event: {}", eventType);
                return WebhookProcessResult.builder()
                        .status("ACKNOWLEDGED")
                        .eventType(eventType)
                        .eventId(eventId)
                        .message("Webhook received but no handler required for event type " + eventType)
                        .processed(false)
                        .build();
            }
        }
    }

    private WebhookProcessResult handleCaptureCompleted(String eventId, JsonNode resource) {
        String customId = resource.path("custom_id").asText();
        String captureId = resource.path("id").asText();
        String amountStr = resource.path("amount").path("value").asText();
        String currency = resource.path("amount").path("currency_code").asText("USD");

        String tripId = null;
        String debtorId = null;
        String expenseId = null;

        if (customId != null && customId.contains("|")) {
            String[] parts = customId.split("\\|");
            if (parts.length >= 3) {
                tripId = parts[0];
                debtorId = parts[1];
                expenseId = parts[2];
            }
        }

        // Fallback: match by paypalOrderId or customId
        Optional<ExpenseSplit> splitOpt = Optional.empty();
        if (expenseId != null && debtorId != null) {
            splitOpt = splitRepository.findByExpenseIdAndUserId(expenseId, debtorId);
        }

        String debtorName = (debtorId != null) ? debtorId : "Member";
        String expenseDesc = "Expense";
        long amountCents = CurrencyUtils.parseDollarsToCents(amountStr);

        if (splitOpt.isPresent()) {
            ExpenseSplit split = splitOpt.get();
            if (split.getPaidStatus() != PaymentStatus.SETTLED) {
                split.setPaidStatus(PaymentStatus.SETTLED);
                split.setSettledAt(Instant.now());
                splitRepository.save(split);
                log.info("Webhook marked split {} as SETTLED for user {}", split.getId(), debtorId);
            }
            debtorId = split.getUserId();
            expenseId = split.getExpenseId();
            amountCents = split.getOwesCents();

            Optional<Expense> exp = expenseRepository.findById(expenseId);
            if (exp.isPresent()) {
                tripId = exp.get().getTripId();
                expenseDesc = exp.get().getDescription();
            }
        } else if (expenseId != null) {
            Optional<Expense> exp = expenseRepository.findById(expenseId);
            if (exp.isPresent()) {
                tripId = exp.get().getTripId();
                expenseDesc = exp.get().getDescription();
            }
        }

        if (tripId != null && debtorId != null) {
            try {
                for (MemberResponse m : memberService.getMembers(tripId)) {
                    if (m.getUserId().equals(debtorId)) {
                        debtorName = m.getName();
                        break;
                    }
                }
            } catch (Exception e) {
                log.debug("Could not resolve member name: {}", e.getMessage());
            }
        }

        String formattedAmount = CurrencyUtils.centsToFormattedString(amountCents);
        String celebrationMsg = String.format("🎉 HALLELUJAH! %s has settled $%s for %s via PayPal!",
                debtorName, formattedAmount, expenseDesc);

        CelebrationEvent celebration = CelebrationEvent.builder()
                .eventId(eventId)
                .eventType("PAYMENT.CAPTURE.COMPLETED")
                .tripId(tripId)
                .debtorId(debtorId)
                .debtorName(debtorName)
                .amountCents(amountCents)
                .formattedAmount(formattedAmount)
                .currency(currency)
                .message(celebrationMsg)
                .timestamp(Instant.now())
                .build();

        eventBroadcaster.broadcast(celebration);

        return WebhookProcessResult.builder()
                .status("SUCCESS")
                .eventType("PAYMENT.CAPTURE.COMPLETED")
                .eventId(eventId)
                .message(celebrationMsg)
                .processed(true)
                .build();
    }

    private WebhookProcessResult handleOrderApproved(String eventId, JsonNode resource) {
        String orderId = resource.path("id").asText();
        log.info("Received CHECKOUT.ORDER.APPROVED for orderId {}. Triggering two-step capture fallback...", orderId);

        try {
            paymentService.captureOrder(orderId);
            return WebhookProcessResult.builder()
                    .status("SUCCESS")
                    .eventType("CHECKOUT.ORDER.APPROVED")
                    .eventId(eventId)
                    .message("Successfully triggered automatic capture for order " + orderId)
                    .processed(true)
                    .build();
        } catch (Exception e) {
            log.warn("Automatic capture triggered by webhook completed with note: {}", e.getMessage());
            return WebhookProcessResult.builder()
                    .status("PROCESSED")
                    .eventType("CHECKOUT.ORDER.APPROVED")
                    .eventId(eventId)
                    .message("Order approval processed: " + e.getMessage())
                    .processed(true)
                    .build();
        }
    }

    private WebhookProcessResult handlePayoutsBatchSuccess(String eventId, JsonNode resource) {
        JsonNode batchHeader = resource.path("batch_header");
        String payoutBatchId = batchHeader.path("payout_batch_id").asText();
        String senderBatchId = batchHeader.path("sender_batch_header").path("sender_batch_id").asText();
        String amount = batchHeader.path("amount").path("value").asText();
        String currency = batchHeader.path("amount").path("currency").asText("USD");

        String celebrationMsg = String.format(
                "💸 Batch Payout Delivered! Group trip reimbursements (%s %s) have successfully landed in members' PayPal accounts.",
                currency, amount);

        CelebrationEvent celebration = CelebrationEvent.builder()
                .eventId(eventId)
                .eventType("PAYOUTSBATCH.SUCCESS")
                .formattedAmount(amount)
                .currency(currency)
                .message(celebrationMsg)
                .timestamp(Instant.now())
                .build();

        eventBroadcaster.broadcast(celebration);

        return WebhookProcessResult.builder()
                .status("SUCCESS")
                .eventType("PAYOUTSBATCH.SUCCESS")
                .eventId(eventId)
                .message(celebrationMsg)
                .processed(true)
                .build();
    }
}
