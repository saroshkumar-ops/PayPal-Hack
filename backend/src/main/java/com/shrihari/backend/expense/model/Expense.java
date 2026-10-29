package com.shrihari.backend.expense.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "expenses",
    indexes = {
        @Index(name = "idx_expense_trip", columnList = "trip_id"),
        @Index(name = "idx_expense_payer", columnList = "paid_by")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {

    @Id
    @Column(name = "id", nullable = false, updatable = false, length = 64)
    private String id;

    @Column(name = "trip_id", nullable = false, length = 64)
    private String tripId;

    @Column(name = "paid_by", nullable = false, length = 64)
    private String paidBy;

    @Column(name = "amount_cents", nullable = false)
    private long amountCents;

    @Column(name = "description", nullable = false, length = 256)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 32)
    @Builder.Default
    private ExpenseCategory category = ExpenseCategory.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(name = "split_type", nullable = false, length = 32)
    @Builder.Default
    private SplitType splitType = SplitType.EQUAL;

    @Column(name = "timestamp", nullable = false, updatable = false)
    @Builder.Default
    private Instant timestamp = Instant.now();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "expense_id")
    @Builder.Default
    private List<ExpenseSplit> splits = new ArrayList<>();
}
