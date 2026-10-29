package com.shrihari.backend.expense.service;

import com.shrihari.backend.common.IdGenerator;
import com.shrihari.backend.common.exception.InvalidSplitException;
import com.shrihari.backend.common.exception.ResourceNotFoundException;
import com.shrihari.backend.expense.dto.ExpenseCreateRequest;
import com.shrihari.backend.expense.dto.ExpenseResponse;
import com.shrihari.backend.expense.model.*;
import com.shrihari.backend.expense.repository.ExpenseRepository;
import com.shrihari.backend.member.dto.MemberResponse;
import com.shrihari.backend.member.service.TripMemberService;
import com.shrihari.backend.trip.service.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final TripService tripService;
    private final TripMemberService memberService;
    private final SplitCalculator splitCalculator;

    @Transactional
    public ExpenseResponse createExpense(String tripId, ExpenseCreateRequest request) {
        // 1. Verify trip exists
        tripService.findTripEntity(tripId);

        // Resolve amountCents from amount if amountCents not directly provided
        if (request.getAmountCents() == null && request.getAmount() != null) {
            request.setAmountCents(com.shrihari.backend.common.CurrencyUtils.doubleToCents(request.getAmount()));
        }

        if (request.getAmountCents() == null || request.getAmountCents() <= 0) {
            throw new InvalidSplitException("Expense amount_cents must be strictly positive.");
        }
        if (request.getPaidBy() == null || request.getPaidBy().trim().isEmpty()) {
            throw new InvalidSplitException("paid_by user ID is required.");
        }

        String paidBy = request.getPaidBy().trim();
        memberService.ensureMemberExists(tripId, paidBy);
        String expenseId = (request.getExpenseId() != null && !request.getExpenseId().trim().isEmpty())
                ? request.getExpenseId().trim()
                : IdGenerator.generateId("exp");

        SplitType splitType = SplitType.fromString(request.getSplitType());
        ExpenseCategory category = ExpenseCategory.fromString(request.getCategory());
        String description = (request.getDescription() != null && !request.getDescription().trim().isEmpty())
                ? request.getDescription().trim()
                : "Expense " + expenseId;

        // 2. Compute splits based on splitType
        List<ExpenseSplit> splits;
        switch (splitType) {
            case EQUAL -> {
                List<String> targetUsers = request.getSplitWithUserIds();
                if (targetUsers == null || targetUsers.isEmpty()) {
                    // Default to all members in trip
                    List<MemberResponse> members = memberService.getMembers(tripId);
                    if (members.isEmpty()) {
                        targetUsers = List.of(paidBy);
                    } else {
                        targetUsers = members.stream().map(MemberResponse::getUserId).toList();
                    }
                }
                splits = splitCalculator.calculateEqualSplit(expenseId, paidBy, request.getAmountCents(), targetUsers);
            }
            case EXACT -> splits = splitCalculator.calculateExactSplit(
                    expenseId, paidBy, request.getAmountCents(), request.getCustomSplits());
            case ITEMIZED -> splits = splitCalculator.calculateItemizedSplit(
                    expenseId, paidBy, request.getAmountCents(), request.getItems(),
                    request.getTaxCents(), request.getTipCents());
            default -> throw new InvalidSplitException("Unsupported split type: " + splitType);
        }

        // Ensure all split debtors are registered in trip members
        for (ExpenseSplit split : splits) {
            memberService.ensureMemberExists(tripId, split.getUserId());
        }

        // 3. Save Expense
        Expense expense = Expense.builder()
                .id(expenseId)
                .tripId(tripId)
                .paidBy(paidBy)
                .amountCents(request.getAmountCents())
                .description(description)
                .category(category)
                .splitType(splitType)
                .timestamp(Instant.now())
                .splits(new ArrayList<>(splits))
                .build();

        Expense saved = expenseRepository.save(expense);
        return ExpenseResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> getExpensesByTrip(String tripId) {
        tripService.findTripEntity(tripId);
        return expenseRepository.findByTripIdOrderByTimestampDesc(tripId).stream()
                .map(ExpenseResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public ExpenseResponse getExpenseById(String expenseId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + expenseId));
        return ExpenseResponse.fromEntity(expense);
    }
}
