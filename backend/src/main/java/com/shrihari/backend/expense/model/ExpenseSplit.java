package com.shrihari.backend.expense.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
    name = "expense_splits",
    indexes = {
        @Index(name = "idx_split_expense", columnList = "expense_id"),
        @Index(name = "idx_split_user", columnList = "user_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseSplit {

    @Id
    @Column(name = "id", nullable = false, updatable = false, length = 64)
    private String id;

    @Column(name = "expense_id", nullable = false, length = 64)
    private String expenseId;

    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    @Column(name = "owes_cents", nullable = false)
    private long owesCents;

    @Enumerated(EnumType.STRING)
    @Column(name = "paid_status", nullable = false, length = 32)
    @Builder.Default
    private PaymentStatus paidStatus = PaymentStatus.PENDING;

    @Column(name = "paypal_order_id", length = 64)
    private String paypalOrderId;

    @Column(name = "payment_url", length = 512)
    private String paymentUrl;

    @Column(name = "settled_at")
    private Instant settledAt;
}
