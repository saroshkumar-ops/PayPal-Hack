package com.shrihari.backend.payment.service;

import com.shrihari.backend.common.exception.InvalidSplitException;
import com.shrihari.backend.common.exception.ResourceNotFoundException;
import com.shrihari.backend.expense.model.Expense;
import com.shrihari.backend.expense.model.ExpenseSplit;
import com.shrihari.backend.expense.model.PaymentStatus;
import com.shrihari.backend.expense.repository.ExpenseRepository;
import com.shrihari.backend.expense.repository.ExpenseSplitRepository;
import com.shrihari.backend.member.model.TripMember;
import com.shrihari.backend.member.service.TripMemberService;
import com.shrihari.backend.payment.client.PayPalClient;
import com.shrihari.backend.payment.dto.CaptureOrderResponse;
import com.shrihari.backend.payment.dto.CreateOrderRequest;
import com.shrihari.backend.payment.dto.CreateOrderResponse;
import com.shrihari.backend.trip.model.Trip;
import com.shrihari.backend.trip.service.TripService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PayPalClient payPalClient;
    private final TripService tripService;
    private final TripMemberService memberService;
    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository splitRepository;

    @Transactional
    public CreateOrderResponse createOrderForSplit(CreateOrderRequest request) {
        if (request.getTripId() == null || request.getTripId().trim().isEmpty()) {
            throw new InvalidSplitException("trip_id is required to create a payment order.");
        }
        if (request.getDebtorId() == null || request.getDebtorId().trim().isEmpty()) {
            throw new InvalidSplitException("debtor_id is required to create a payment order.");
        }
        if (request.getExpenseId() == null || request.getExpenseId().trim().isEmpty()) {
            throw new InvalidSplitException("expense_id is required to create a payment order.");
        }

        String tripId = request.getTripId().trim();
        String debtorId = request.getDebtorId().trim();
        String expenseId = request.getExpenseId().trim();

        Trip trip = tripService.findTripEntity(tripId);
        TripMember debtor = memberService.findMemberEntity(tripId, debtorId);
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + expenseId));

        // Find debtor's split in this expense
        ExpenseSplit debtorSplit = expense.getSplits().stream()
                .filter(s -> s.getUserId().equals(debtorId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("No split found for user " + debtorId + " in expense " + expenseId));

        if (debtorSplit.getPaidStatus() == PaymentStatus.SETTLED) {
            throw new InvalidSplitException("This split is already marked as SETTLED.");
        }

        long amountCents = (request.getAmountCents() != null && request.getAmountCents() > 0)
                ? request.getAmountCents()
                : debtorSplit.getOwesCents();

        String currency = (request.getCurrency() != null && !request.getCurrency().trim().isEmpty())
                ? request.getCurrency().trim().toUpperCase()
                : trip.getCurrency();

        // Contract 3 custom_id format: trip_id|debtor_user_id|expense_id
        String customId = String.format("%s|%s|%s", tripId, debtorId, expenseId);
        String description = String.format("TripSheriff: %s share for %s", expense.getDescription(), debtor.getName());

        CreateOrderResponse response = payPalClient.createOrder(amountCents, currency, customId, description);

        // Update ExpenseSplit with PayPal tracking metadata
        debtorSplit.setPaypalOrderId(response.getOrderId());
        debtorSplit.setPaymentUrl(response.getApproveUrl());
        splitRepository.save(debtorSplit);

        log.info("Linked PayPal order {} and paymentUrl to split {} for debtor {}",
                response.getOrderId(), debtorSplit.getId(), debtorId);

        return response;
    }

    @Transactional
    public CaptureOrderResponse captureOrder(String orderId) {
        log.info("Executing two-step capture for PayPal order {}", orderId);
        CaptureOrderResponse capture = payPalClient.captureOrder(orderId);

        if ("COMPLETED".equalsIgnoreCase(capture.getStatus())) {
            // Locate the split via paypalOrderId or by parsing customId
            ExpenseSplit split = splitRepository.findByPaypalOrderId(orderId).orElse(null);

            if (split == null && capture.getCustomId() != null) {
                String[] parts = capture.getCustomId().split("\\|");
                if (parts.length >= 3) {
                    String debtorId = parts[1];
                    String expenseId = parts[2];
                    split = expenseRepository.findById(expenseId)
                            .flatMap(e -> e.getSplits().stream().filter(s -> s.getUserId().equals(debtorId)).findFirst())
                            .orElse(null);
                }
            }

            if (split != null) {
                split.setPaidStatus(PaymentStatus.SETTLED);
                split.setSettledAt(Instant.now());
                splitRepository.save(split);

                // Populate response metadata
                capture.setExpenseId(split.getExpenseId());
                capture.setDebtorId(split.getUserId());
                capture.setAmountCents(split.getOwesCents());

                log.info("Marked split {} as SETTLED for user {} on expense {}",
                        split.getId(), split.getUserId(), split.getExpenseId());
            } else {
                log.warn("Could not find matching ExpenseSplit for captured order {}", orderId);
            }
        }

        return capture;
    }
}
