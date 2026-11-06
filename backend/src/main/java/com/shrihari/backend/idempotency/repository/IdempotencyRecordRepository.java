package com.shrihari.backend.idempotency.repository;

import com.shrihari.backend.idempotency.model.IdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecord, String> {
    Optional<IdempotencyRecord> findByIdempotencyKey(String idempotencyKey);
}
