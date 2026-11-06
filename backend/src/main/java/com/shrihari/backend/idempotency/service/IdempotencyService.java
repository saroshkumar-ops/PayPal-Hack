package com.shrihari.backend.idempotency.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shrihari.backend.idempotency.model.IdempotencyRecord;
import com.shrihari.backend.idempotency.repository.IdempotencyRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.function.Supplier;

@Slf4j
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final IdempotencyRecordRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional
    public <T> T executeIdempotent(String idempotencyKey, String resourceType, Class<T> responseClass, Supplier<T> operation) {
        if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            // No idempotency key provided, proceed directly
            return operation.get();
        }

        String key = idempotencyKey.trim();
        Optional<IdempotencyRecord> existing = repository.findByIdempotencyKey(key);

        if (existing.isPresent()) {
            log.info("Idempotent operation detected for key '{}'. Returning cached response.", key);
            try {
                return objectMapper.readValue(existing.get().getResponseBody(), responseClass);
            } catch (Exception e) {
                log.error("Failed to deserialize cached idempotent response for key {}: {}", key, e.getMessage());
                // Fallback to fresh execution if deserialization fails
            }
        }

        T result = operation.get();

        try {
            String json = objectMapper.writeValueAsString(result);
            IdempotencyRecord record = IdempotencyRecord.builder()
                    .idempotencyKey(key)
                    .resourceType(resourceType)
                    .statusCode(200)
                    .responseBody(json)
                    .build();
            repository.save(record);
        } catch (Exception e) {
            log.warn("Failed to record idempotency cache for key {}: {}", key, e.getMessage());
        }

        return result;
    }
}
