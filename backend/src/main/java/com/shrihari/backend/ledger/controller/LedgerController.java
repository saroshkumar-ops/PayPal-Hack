package com.shrihari.backend.ledger.controller;

import com.shrihari.backend.ledger.dto.LedgerResponse;
import com.shrihari.backend.ledger.dto.SettlementTransaction;
import com.shrihari.backend.ledger.service.LedgerEngine;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Ledger", description = "Double-entry financial ledger and Bipartite Minimum Cash Flow debt simplification graph (Contract 1)")
@RestController
@RequestMapping("/api/trips/{tripId}")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LedgerController {

    private final LedgerEngine ledgerEngine;

    @Operation(summary = "Get full trip ledger", description = "Calculates net integer-cent balances, platform escrow, member details, and Contract 1 debt graph")
    @GetMapping("/ledger")
    public ResponseEntity<LedgerResponse> getTripLedger(@PathVariable String tripId) {
        return ResponseEntity.ok(ledgerEngine.getTripLedger(tripId));
    }

    @Operation(summary = "Get simplified settlements", description = "Generates optimal N-1 Bipartite Minimum Cash Flow debt settlement transactions")
    @GetMapping("/settlements")
    public ResponseEntity<List<SettlementTransaction>> getSettlements(@PathVariable String tripId) {
        return ResponseEntity.ok(ledgerEngine.getSettlements(tripId));
    }
}
