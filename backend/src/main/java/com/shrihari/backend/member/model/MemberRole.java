package com.shrihari.backend.member.model;

public enum MemberRole {
    ORGANIZER,
    MEMBER;

    public static MemberRole fromString(String role) {
        if (role == null) return MEMBER;
        try {
            return MemberRole.valueOf(role.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return MEMBER;
        }
    }
}
