package com.shrihari.backend.payout.controller;

import com.shrihari.backend.payout.dto.PayoutBatchStatusResponse;
import com.shrihari.backend.payout.dto.PayoutConfirmRequest;
import com.shrihari.backend.payout.dto.PayoutConfirmResponse;
import com.shrihari.backend.payout.dto.PayoutProposalResponse;
import com.shrihari.backend.payout.service.PayoutService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/trips/{tripId}/payout")
@RequiredArgsConstructor
public class PayoutController {

    private final PayoutService payoutService;

    /**
     * Human-in-the-Loop Proposal:
     * GET /api/trips/{tripId}/payout/proposal
     * Prepares batch payout line items and returns summary for organizer approval.
     */
    @GetMapping("/proposal")
    public ResponseEntity<PayoutProposalResponse> getPayoutProposal(@PathVariable String tripId) {
        log.info("Generating payout proposal for trip {}", tripId);
        PayoutProposalResponse response = payoutService.generatePayoutProposal(tripId);
        return ResponseEntity.ok(response);
    }

    /**
     * Batch Payout Confirmation:
     * POST /api/trips/{tripId}/payout/confirm
     * Disburses funds via PayPal Batch Payouts API with PayPal-Request-Id idempotency protection.
     */
    @PostMapping("/confirm")
    public ResponseEntity<PayoutConfirmResponse> confirmBatchPayout(
            @PathVariable String tripId,
            @RequestBody PayoutConfirmRequest request) {

        log.info("Organizer confirming batch payout for trip {} with idempotencyKey {}",
                tripId, request.getIdempotencyKey());

        PayoutConfirmResponse response = payoutService.confirmBatchPayout(tripId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Batch Payout Status:
     * GET /api/trips/{tripId}/payout/{batchId}
     * Queries PayPal Batch Payouts API for real-time status.
     */
    @GetMapping("/{batchId}")
    public ResponseEntity<PayoutBatchStatusResponse> getPayoutBatchStatus(
            @PathVariable String tripId,
            @PathVariable String batchId) {

        log.info("Checking payout batch status for trip {} batchId {}", tripId, batchId);
        PayoutBatchStatusResponse response = payoutService.getPayoutBatchStatus(tripId, batchId);
        return ResponseEntity.ok(response);
    }
}
