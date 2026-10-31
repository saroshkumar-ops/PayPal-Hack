package com.shrihari.backend.payout.service;

import com.shrihari.backend.common.CurrencyUtils;
import com.shrihari.backend.common.IdGenerator;
import com.shrihari.backend.ledger.dto.LedgerResponse;
import com.shrihari.backend.ledger.model.Settlement;
import com.shrihari.backend.ledger.model.SettlementStatus;
import com.shrihari.backend.ledger.repository.SettlementRepository;
import com.shrihari.backend.ledger.service.LedgerEngine;
import com.shrihari.backend.member.dto.MemberResponse;
import com.shrihari.backend.member.service.TripMemberService;
import com.shrihari.backend.payment.client.PayPalClient;
import com.shrihari.backend.payout.dto.*;
import com.shrihari.backend.trip.model.Trip;
import com.shrihari.backend.trip.service.TripService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayoutService {

    private final TripService tripService;
    private final TripMemberService memberService;
    private final LedgerEngine ledgerEngine;
    private final SettlementRepository settlementRepository;
    private final PayPalClient payPalClient;

    /**
     * Generates a Human-in-the-Loop batch payout proposal based on the current ledger state.
     * Evaluates creditors with positive balances and available platform escrow.
     */
    @Transactional(readOnly = true)
    public PayoutProposalResponse generatePayoutProposal(String tripId) {
        Trip trip = tripService.findTripEntity(tripId);
        LedgerResponse ledger = ledgerEngine.getTripLedger(tripId);
        List<MemberResponse> members = memberService.getMembers(tripId);
        Map<String, MemberResponse> memberMap = members.stream()
                .collect(Collectors.toMap(MemberResponse::getUserId, m -> m));

        Map<String, Long> netBalances = ledger.getNetBalancesCents();
        long platformEscrowCents = ledger.getPlatformEscrowCents();

        List<PayoutBatchItemDto> items = new ArrayList<>();
        long totalOwedCreditors = 0L;

        for (Map.Entry<String, Long> entry : netBalances.entrySet()) {
            String userId = entry.getKey();
            Long balance = entry.getValue();

            if (balance != null && balance > 0) {
                totalOwedCreditors += balance;
                MemberResponse member = memberMap.get(userId);
                String memberName = member != null ? member.getName() : userId;

                // Derive receiver sandbox email
                String receiverEmail = (member != null && member.getPaypalEmail() != null && !member.getPaypalEmail().isBlank())
                        ? member.getPaypalEmail()
                        : memberName.toLowerCase().replace(" ", ".") + "@personal.example.com";

                String note = String.format("TripSheriff: Net reimbursement for %s (%s)", trip.getName(), memberName);
                String senderItemId = "settle_" + userId + "_" + System.currentTimeMillis();

                items.add(PayoutBatchItemDto.builder()
                        .userId(userId)
                        .memberName(memberName)
                        .receiverEmail(receiverEmail)
                        .amountCents(balance)
                        .formattedAmount(CurrencyUtils.centsToFormattedString(balance))
                        .currency(trip.getCurrency())
                        .note(note)
                        .senderItemId(senderItemId)
                        .build());
            }
        }

        long totalPayoutCents = totalOwedCreditors;
        String warning = null;

        if (items.isEmpty()) {
            warning = "No creditors with positive balance found. All expenses are settled!";
        } else if (platformEscrowCents < totalPayoutCents && platformEscrowCents > 0) {
            warning = String.format(
                    "Platform escrow has $%s collected, which is less than total owed ($%s). Partial settlement will disburse available escrow.",
                    CurrencyUtils.centsToFormattedString(platformEscrowCents),
                    CurrencyUtils.centsToFormattedString(totalPayoutCents)
            );
        } else if (platformEscrowCents == 0 && totalPayoutCents > 0) {
            warning = "Platform escrow is currently $0.00. Members must pay their shares via PayPal before real funds can be disbursed.";
        }

        String idempotencyKey = UUID.randomUUID().toString();

        return PayoutProposalResponse.builder()
                .tripId(trip.getId())
                .currency(trip.getCurrency())
                .platformEscrowCents(platformEscrowCents)
                .formattedPlatformEscrow(CurrencyUtils.centsToFormattedString(platformEscrowCents))
                .totalPayoutCents(totalPayoutCents)
                .formattedTotalPayout(CurrencyUtils.centsToFormattedString(totalPayoutCents))
                .idempotencyKey(idempotencyKey)
                .requiresConfirmation(true)
                .items(items)
                .warning(warning)
                .build();
    }

    /**
     * Executes the Batch Payout with strict idempotency protection.
     * Prevents duplicate execution if the organizer clicks confirm repeatedly.
     */
    @Transactional
    public PayoutConfirmResponse confirmBatchPayout(String tripId, PayoutConfirmRequest request) {
        Trip trip = tripService.findTripEntity(tripId);

        String idempotencyKey = request.getIdempotencyKey();
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("idempotency_key is required for batch payout confirmation");
        }

        // 1. Idempotency Check: if settlements with this key already exist, return existing result without re-executing
        List<Settlement> existingSettlements = settlementRepository.findByIdempotencyKey(idempotencyKey);
        if (!existingSettlements.isEmpty()) {
            log.info("[IDEMPOTENCY] Batch payout with key {} was already executed, replaying previous response", idempotencyKey);
            return buildIdempotentReplayResponse(trip, existingSettlements, idempotencyKey);
        }

        // 2. Generate current proposal to extract items
        PayoutProposalResponse proposal = generatePayoutProposal(tripId);
        List<PayoutBatchItemDto> items = proposal.getItems();

        if (items.isEmpty()) {
            throw new IllegalStateException("No eligible creditors to reimburse for trip " + tripId);
        }

        String senderBatchId = "batch_payout_" + tripId + "_" + System.currentTimeMillis();
        String emailSubject = (request.getEmailSubject() != null && !request.getEmailSubject().isBlank())
                ? request.getEmailSubject()
                : "TripSheriff: Your Trip Reimbursement for " + trip.getName();
        String emailMessage = (request.getEmailMessage() != null && !request.getEmailMessage().isBlank())
                ? request.getEmailMessage()
                : "The trip ledger has been settled. Funds have been disbursed to your PayPal account.";

        // 3. Call PayPal Batch Payouts API with PayPal-Request-Id header
        PayPalClient.PayoutBatchExecutionResult result = payPalClient.executeBatchPayout(
                senderBatchId,
                items,
                emailSubject,
                emailMessage,
                idempotencyKey
        );

        // 4. Persist completed Settlement records in database
        Instant now = Instant.now();
        List<Settlement> savedSettlements = new ArrayList<>();

        for (PayoutBatchItemDto item : items) {
            Settlement settlement = Settlement.builder()
                    .id(IdGenerator.settlementId())
                    .tripId(tripId)
                    .fromUserId("PLATFORM_ESCROW")
                    .toUserId(item.getUserId())
                    .amountCents(item.getAmountCents())
                    .currency(item.getCurrency())
                    .status(SettlementStatus.COMPLETED)
                    .paypalPayoutBatchId(result.payoutBatchId())
                    .idempotencyKey(idempotencyKey)
                    .createdAt(now)
                    .settledAt(now)
                    .build();

            savedSettlements.add(settlementRepository.save(settlement));
        }

        long totalDisbursed = items.stream().mapToLong(PayoutBatchItemDto::getAmountCents).sum();

        log.info("Successfully executed batch payout {} for trip {}: disbursed {} cents across {} recipients",
                result.payoutBatchId(), tripId, totalDisbursed, items.size());

        return PayoutConfirmResponse.builder()
                .tripId(tripId)
                .payoutBatchId(result.payoutBatchId())
                .batchStatus(result.batchStatus())
                .idempotencyKey(idempotencyKey)
                .totalDisbursedCents(totalDisbursed)
                .formattedTotalDisbursed(CurrencyUtils.centsToFormattedString(totalDisbursed))
                .currency(trip.getCurrency())
                .items(items)
                .settledRecipientsCount(items.size())
                .isIdempotentReplay(false)
                .executedAt(now)
                .message(String.format("Batch payout executed successfully. Reimbursed %d members (%s %s)",
                        items.size(), trip.getCurrency(), CurrencyUtils.centsToFormattedString(totalDisbursed)))
                .build();
    }

    /**
     * Queries the status of an existing payout batch from PayPal.
     */
    @Transactional(readOnly = true)
    public PayoutBatchStatusResponse getPayoutBatchStatus(String tripId, String batchId) {
        tripService.findTripEntity(tripId);
        return payPalClient.getPayoutBatch(batchId);
    }

    private PayoutConfirmResponse buildIdempotentReplayResponse(
            Trip trip,
            List<Settlement> settlements,
            String idempotencyKey) {

        long totalDisbursed = settlements.stream().mapToLong(Settlement::getAmountCents).sum();
        String batchId = settlements.get(0).getPaypalPayoutBatchId();
        Instant executedAt = settlements.get(0).getSettledAt();

        List<MemberResponse> members = memberService.getMembers(trip.getId());
        Map<String, MemberResponse> memberMap = members.stream()
                .collect(Collectors.toMap(MemberResponse::getUserId, m -> m));

        List<PayoutBatchItemDto> items = settlements.stream().map(s -> {
            MemberResponse m = memberMap.get(s.getToUserId());
            String name = m != null ? m.getName() : s.getToUserId();
            String email = m != null ? m.getPaypalEmail() : "";
            return PayoutBatchItemDto.builder()
                    .userId(s.getToUserId())
                    .memberName(name)
                    .receiverEmail(email)
                    .amountCents(s.getAmountCents())
                    .formattedAmount(CurrencyUtils.centsToFormattedString(s.getAmountCents()))
                    .currency(s.getCurrency())
                    .note("Idempotent replay settlement")
                    .senderItemId("settle_" + s.getToUserId())
                    .build();
        }).toList();

        return PayoutConfirmResponse.builder()
                .tripId(trip.getId())
                .payoutBatchId(batchId)
                .batchStatus("SUCCESS")
                .idempotencyKey(idempotencyKey)
                .totalDisbursedCents(totalDisbursed)
                .formattedTotalDisbursed(CurrencyUtils.centsToFormattedString(totalDisbursed))
                .currency(trip.getCurrency())
                .items(items)
                .settledRecipientsCount(items.size())
                .isIdempotentReplay(true)
                .executedAt(executedAt)
                .message("Idempotent replay: batch payout was previously executed.")
                .build();
    }
}
