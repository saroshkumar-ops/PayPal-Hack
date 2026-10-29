package com.shrihari.backend.trip.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.shrihari.backend.trip.model.Trip;
import com.shrihari.backend.trip.model.TripStatus;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TripResponse {

    @JsonProperty("trip_id")
    private String tripId;

    private String name;

    private String currency;

    private TripStatus status;

    @JsonProperty("created_at")
    private Instant createdAt;

    public static TripResponse fromEntity(Trip trip) {
        return TripResponse.builder()
                .tripId(trip.getId())
                .name(trip.getName())
                .currency(trip.getCurrency())
                .status(trip.getStatus())
                .createdAt(trip.getCreatedAt())
                .build();
    }
}
