package com.shrihari.backend.payment.controller;

import com.shrihari.backend.common.CurrencyUtils;
import com.shrihari.backend.payment.dto.CaptureOrderResponse;
import com.shrihari.backend.payment.dto.CreateOrderRequest;
import com.shrihari.backend.payment.dto.CreateOrderResponse;
import com.shrihari.backend.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Payments", description = "PayPal Orders API v2 creation, redirect success capture, and programmatic capture flow (Task C)")
@Slf4j
@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentService paymentService;

    @Operation(summary = "Create PayPal checkout order", description = "Creates a PayPal Orders v2 transaction for an individual split debt and returns the sandbox approval URL")
    @PostMapping("/create-order")
    public ResponseEntity<CreateOrderResponse> createOrder(@RequestBody CreateOrderRequest request) {
        CreateOrderResponse response = paymentService.createOrderForSplit(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "Capture PayPal order (Direct)", description = "Direct server-to-server call to capture approved order and transition split to SETTLED")
    @PostMapping("/capture/{orderId}")
    public ResponseEntity<CaptureOrderResponse> captureDirect(@PathVariable String orderId) {
        CaptureOrderResponse response = paymentService.captureOrder(orderId);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Buyer redirect return URL", description = "Captures the PayPal order upon redirect and renders a celebratory confirmation page or JSON")
    @GetMapping("/success")
    public ResponseEntity<?> paymentSuccess(
            @RequestParam(value = "token", required = false) String token,
            @RequestParam(value = "order_id", required = false) String orderIdParam,
            @RequestHeader(value = HttpHeaders.ACCEPT, required = false) String acceptHeader) {

        String orderId = (token != null && !token.trim().isEmpty()) ? token.trim() : orderIdParam;
        if (orderId == null || orderId.isEmpty()) {
            return ResponseEntity.badRequest().body("Missing PayPal order token");
        }

        CaptureOrderResponse capture = paymentService.captureOrder(orderId);

        // If client expects JSON (e.g. mobile app or automated caller)
        if (acceptHeader != null && acceptHeader.contains(MediaType.APPLICATION_JSON_VALUE)) {
            return ResponseEntity.ok(capture);
        }

        // Return a sleek, modern celebratory HTML page for the redirected user
        String formattedAmount = CurrencyUtils.centsToFormattedString(capture.getAmountCents());
        String html = """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>TripSheriff — Payment Captured</title>
                    <style>
                        body {
                            margin: 0; padding: 0; display: flex; align-items: center; justify-content: center;
                            min-height: 100vh; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc;
                        }
                        .card {
                            background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 40px;
                            max-width: 480px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
                        }
                        .badge {
                            display: inline-block; background: #065f46; color: #34d399; font-weight: 700;
                            padding: 6px 14px; border-radius: 9999px; font-size: 13px; margin-bottom: 20px;
                        }
                        h1 { margin: 0 0 10px; font-size: 26px; color: #f1f5f9; }
                        p { color: #94a3b8; font-size: 15px; line-height: 1.5; margin: 0 0 24px; }
                        .details {
                            background: #0f172a; border-radius: 10px; padding: 16px; margin-bottom: 24px; text-align: left;
                        }
                        .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                        .row:last-child { margin-bottom: 0; }
                        .label { color: #64748b; }
                        .val { font-weight: 600; color: #e2e8f0; }
                        .btn {
                            display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none;
                            padding: 12px 28px; border-radius: 8px; font-weight: 600; transition: background 0.2s;
                        }
                        .btn:hover { background: #1d4ed8; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="badge">✓ CAPTURE COMPLETED</div>
                        <h1>🎉 Payment Cleared!</h1>
                        <p>Your share has been captured on PayPal Sandbox rails. The trip ledger has been updated and your debt is officially settled.</p>
                        <div class="details">
                            <div class="row"><span class="label">Order ID:</span><span class="val">%s</span></div>
                            <div class="row"><span class="label">Capture ID:</span><span class="val">%s</span></div>
                            <div class="row"><span class="label">Amount Settled:</span><span class="val">$%s USD</span></div>
                            <div class="row"><span class="label">Status:</span><span class="val" style="color: #34d399;">SETTLED</span></div>
                        </div>
                        <a href="javascript:window.close();" class="btn">Close Window</a>
                    </div>
                </body>
                </html>
                """.formatted(capture.getOrderId(), capture.getCaptureId(), formattedAmount);

        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }

    /**
     * Cancel Callback: GET /api/payment/cancel?token={orderId}
     */
    @GetMapping("/cancel")
    public ResponseEntity<String> paymentCancel(@RequestParam(value = "token", required = false) String token) {
        String html = """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>TripSheriff — Payment Cancelled</title>
                    <style>
                        body { background: #0f172a; font-family: sans-serif; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
                        .card { background: #1e293b; padding: 40px; border-radius: 16px; text-align: center; max-width: 420px; border: 1px solid #334155; }
                        h1 { color: #f87171; font-size: 22px; }
                        p { color: #94a3b8; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h1>Payment Cancelled</h1>
                        <p>No funds were transferred. You can reopen the payment link whenever you are ready to settle.</p>
                    </div>
                </body>
                </html>
                """;
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }
}
