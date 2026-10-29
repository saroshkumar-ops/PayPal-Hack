package com.shrihari.backend.trip.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TripCreateRequest {

    @JsonProperty("trip_id")
    private String tripId;

    private String name;

    private String currency;
}
