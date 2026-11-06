package com.shrihari.backend.idempotency.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
    name = "idempotency_records",
    indexes = {
        @Index(name = "idx_idemp_key", columnList = "idempotency_key", unique = true)
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IdempotencyRecord {

    @Id
    @Column(name = "idempotency_key", nullable = false, length = 128)
    private String idempotencyKey;

    @Column(name = "resource_type", nullable = false, length = 64)
    private String resourceType;

    @Column(name = "status_code", nullable = false)
    private int statusCode;

    @Lob
    @Column(name = "response_body")
    private String responseBody;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
