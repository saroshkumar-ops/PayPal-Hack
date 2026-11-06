package com.shrihari.backend.demo.controller;

import com.shrihari.backend.demo.dto.DemoSeedResponse;
import com.shrihari.backend.demo.service.DemoSeedService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Demo", description = "One-click showcase demo seeder for testing, web UI integration, and live judging")
@Slf4j
@RestController
@RequestMapping("/api/demo")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DemoController {

    private final DemoSeedService demoSeedService;

    @Operation(
        summary = "One-click Demo Seeder / Reset",
        description = "Resets and seeds the Bali 2026 showcase trip with 4 participants (mock PayPal sandbox accounts), 2 fronted expenses, and simplified settlement debts. Returns full trip payload so the UI can immediately render."
    )
    @PostMapping("/seed")
    public ResponseEntity<DemoSeedResponse> seedDemo() {
        log.info("Request received to seed/reset demo trip");
        DemoSeedResponse response = demoSeedService.seedDemoTrip();
        return ResponseEntity.ok(response);
    }
}

