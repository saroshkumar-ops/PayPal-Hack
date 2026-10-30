package com.shrihari.backend.trip.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimTimeResponse {

    @JsonProperty("trip_id")
    private String tripId;

    @JsonProperty("total_hours_advanced")
    private long totalHoursAdvanced;

    @JsonProperty("effective_now")
    private Instant effectiveNow;

    private String message;
}
