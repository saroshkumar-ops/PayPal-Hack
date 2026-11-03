package com.shrihari.backend.ledger.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
    name = "settlements",
    indexes = {
        @Index(name = "idx_settle_trip", columnList = "trip_id"),
        @Index(name = "idx_settle_debtor", columnList = "from_user_id"),
        @Index(name = "idx_settle_creditor", columnList = "to_user_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Settlement {

    @Id
    @Column(name = "id", nullable = false, updatable = false, length = 64)
    private String id;

    @Column(name = "trip_id", nullable = false, length = 64)
    private String tripId;

    @Column(name = "from_user_id", nullable = false, length = 64)
    private String fromUserId;

    @Column(name = "to_user_id", nullable = false, length = 64)
    private String toUserId;

    @Column(name = "amount_cents", nullable = false)
    private long amountCents;

    @Column(name = "currency", nullable = false, length = 8)
    @Builder.Default
    private String currency = "USD";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    @Builder.Default
    private SettlementStatus status = SettlementStatus.PROPOSED;

    @Column(name = "paypal_payout_batch_id", length = 128)
    private String paypalPayoutBatchId;

    @Column(name = "idempotency_key", length = 128)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "settled_at")
    private Instant settledAt;
}
