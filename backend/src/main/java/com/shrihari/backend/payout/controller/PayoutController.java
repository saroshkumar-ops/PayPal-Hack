package com.shrihari.backend.payout.controller;

import com.shrihari.backend.payout.dto.PayoutBatchStatusResponse;
import com.shrihari.backend.payout.dto.PayoutConfirmRequest;
import com.shrihari.backend.payout.dto.PayoutConfirmResponse;
import com.shrihari.backend.payout.dto.PayoutProposalResponse;
import com.shrihari.backend.payout.service.PayoutService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Payouts", description = "PayPal Batch Payouts API multi-recipient settlement engine with Human-in-the-Loop authorization and idempotency protection (Task D)")
@Slf4j
@RestController
@RequestMapping("/api/trips/{tripId}/payout")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PayoutController {

    private final PayoutService payoutService;
    private final com.shrihari.backend.idempotency.service.IdempotencyService idempotencyService;

    @Operation(summary = "Human-in-the-Loop payout proposal", description = "Prepares batch payout line items for net creditors, validates platform escrow, and generates an idempotency key for review")
    @GetMapping("/proposal")
    public ResponseEntity<PayoutProposalResponse> getPayoutProposal(@PathVariable String tripId) {
        log.info("Generating payout proposal for trip {}", tripId);
        PayoutProposalResponse response = payoutService.generatePayoutProposal(tripId);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Confirm and execute batch payout", description = "Executes POST /v1/payments/payouts with PayPal-Request-Id header to reimburse participants atomically with zero duplicate risk")
    @PostMapping("/confirm")
    public ResponseEntity<PayoutConfirmResponse> confirmBatchPayout(
            @PathVariable String tripId,
            @RequestBody PayoutConfirmRequest request) {

        log.info("Organizer confirming batch payout for trip {} with idempotencyKey {}",
                tripId, request.getIdempotencyKey());

        PayoutConfirmResponse response = payoutService.confirmBatchPayout(tripId, request);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Query payout batch status", description = "Checks real-time disbursement and acknowledgment status of a PayPal payout batch")
    @GetMapping("/{batchId}")
    public ResponseEntity<PayoutBatchStatusResponse> getPayoutBatchStatus(
            @PathVariable String tripId,
            @PathVariable String batchId) {

        log.info("Checking payout batch status for trip {} batchId {}", tripId, batchId);
        PayoutBatchStatusResponse response = payoutService.getPayoutBatchStatus(tripId, batchId);
        return ResponseEntity.ok(response);
    }
}
