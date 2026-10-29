package com.shrihari.backend.member.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
    name = "trip_members",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"trip_id", "user_id"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TripMember {

    @Id
    @Column(name = "id", nullable = false, updatable = false, length = 64)
    private String id;

    @Column(name = "trip_id", nullable = false, length = 64)
    private String tripId;

    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "handle", length = 64)
    private String handle;

    @Column(name = "paypal_email", length = 128)
    private String paypalEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 32)
    @Builder.Default
    private MemberRole role = MemberRole.MEMBER;

    @Enumerated(EnumType.STRING)
    @Column(name = "roast_consent", nullable = false, length = 32)
    @Builder.Default
    private RoastConsent roastConsent = RoastConsent.MILD;

    @Column(name = "joined_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant joinedAt = Instant.now();
}
