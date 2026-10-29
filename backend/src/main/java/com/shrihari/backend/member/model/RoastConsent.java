package com.shrihari.backend.member.model;

public enum RoastConsent {
    MILD,
    SPICY,
    NO_ROAST;

    public static RoastConsent fromString(String consent) {
        if (consent == null) return MILD;
        try {
            return RoastConsent.valueOf(consent.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return MILD;
        }
    }
}
