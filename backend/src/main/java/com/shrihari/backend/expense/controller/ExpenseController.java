package com.shrihari.backend.expense.controller;

import com.shrihari.backend.expense.dto.ExpenseCreateRequest;
import com.shrihari.backend.expense.dto.ExpenseResponse;
import com.shrihari.backend.expense.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips/{tripId}/expenses")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ExpenseController {

    private final ExpenseService expenseService;

    @PostMapping
    public ResponseEntity<ExpenseResponse> createExpense(
            @PathVariable String tripId,
            @RequestBody ExpenseCreateRequest request) {
        ExpenseResponse response = expenseService.createExpense(tripId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ExpenseResponse>> getExpenses(@PathVariable String tripId) {
        return ResponseEntity.ok(expenseService.getExpensesByTrip(tripId));
    }
}
