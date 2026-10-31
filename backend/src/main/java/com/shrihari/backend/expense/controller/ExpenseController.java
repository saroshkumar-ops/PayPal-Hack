package com.shrihari.backend.expense.controller;

import com.shrihari.backend.expense.dto.ExpenseCreateRequest;
import com.shrihari.backend.expense.dto.ExpenseResponse;
import com.shrihari.backend.expense.service.ExpenseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Expenses", description = "Group expense logging with EQUAL (deterministic remainder cent distribution), EXACT, and ITEMIZED split calculations")
@RestController
@RequestMapping("/api/trips/{tripId}/expenses")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ExpenseController {

    private final ExpenseService expenseService;

    @Operation(summary = "Log an expense", description = "Logs a group expense in integer cents and calculates member split liabilities with zero floating-point drift")
    @PostMapping
    public ResponseEntity<ExpenseResponse> createExpense(
            @PathVariable String tripId,
            @RequestBody ExpenseCreateRequest request) {
        ExpenseResponse response = expenseService.createExpense(tripId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "List trip expenses", description = "Retrieves all expenses logged for a trip along with their calculated splits")
    @GetMapping
    public ResponseEntity<List<ExpenseResponse>> getExpenses(@PathVariable String tripId) {
        return ResponseEntity.ok(expenseService.getExpensesByTrip(tripId));
    }
}
