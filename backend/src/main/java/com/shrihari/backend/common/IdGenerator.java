package com.shrihari.backend.common;

import java.util.UUID;

/**
 * Generator for clean, contract-compliant prefixed IDs (e.g. trip_..., exp_..., user_...).
 */
public final class IdGenerator {

    private IdGenerator() {}

    public static String generateId(String prefix) {
        String shortUuid = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        return prefix + "_" + shortUuid;
    }

    public static String settlementId() {
        return generateId("settle");
    }
}
