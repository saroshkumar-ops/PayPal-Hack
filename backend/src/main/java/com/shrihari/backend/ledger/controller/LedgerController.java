package com.shrihari.backend.ledger.controller;

import com.shrihari.backend.ledger.dto.LedgerResponse;
import com.shrihari.backend.ledger.dto.SettlementTransaction;
import com.shrihari.backend.ledger.service.LedgerEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips/{tripId}")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LedgerController {

    private final LedgerEngine ledgerEngine;

    @GetMapping("/ledger")
    public ResponseEntity<LedgerResponse> getTripLedger(@PathVariable String tripId) {
        return ResponseEntity.ok(ledgerEngine.getTripLedger(tripId));
    }

    @GetMapping("/settlements")
    public ResponseEntity<List<SettlementTransaction>> getSettlements(@PathVariable String tripId) {
        return ResponseEntity.ok(ledgerEngine.getSettlements(tripId));
    }
}
