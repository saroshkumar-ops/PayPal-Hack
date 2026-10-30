package com.shrihari.backend.trip.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimTimeRequest {

    @JsonProperty("hours_to_advance")
    private Long hoursToAdvance;
}
