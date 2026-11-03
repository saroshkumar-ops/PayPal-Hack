package com.shrihari.backend.trip.controller;

import com.shrihari.backend.trip.dto.TripCreateRequest;
import com.shrihari.backend.trip.dto.TripResponse;
import com.shrihari.backend.trip.service.TripService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Trips", description = "Trip lifecycle management and environment time-warp simulation")
@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TripController {

    private final TripService tripService;

    @Operation(summary = "Create a new trip", description = "Initializes a group trip treasury with currency and name")
    @PostMapping
    public ResponseEntity<TripResponse> createTrip(@RequestBody TripCreateRequest request) {
        TripResponse response = tripService.createTrip(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "List all trips", description = "Retrieves all active and completed trips")
    @GetMapping
    public ResponseEntity<List<TripResponse>> getAllTrips() {
        return ResponseEntity.ok(tripService.getAllTrips());
    }

    @Operation(summary = "Get trip details", description = "Fetches a specific trip by its unique ID")
    @GetMapping("/{tripId}")
    public ResponseEntity<TripResponse> getTrip(@PathVariable String tripId) {
        return ResponseEntity.ok(tripService.getTripById(tripId));
    }

    @Operation(summary = "Environment time-warp simulation", description = "Fast-forwards virtual trip clock by +24h/+48h to simulate debt aging for escalation demos")
    @PostMapping("/{tripId}/sim-time")
    public ResponseEntity<com.shrihari.backend.trip.dto.SimTimeResponse> advanceSimTime(
            @PathVariable String tripId,
            @RequestBody(required = false) com.shrihari.backend.trip.dto.SimTimeRequest request) {
        Long hours = (request != null) ? request.getHoursToAdvance() : 24L;
        return ResponseEntity.ok(tripService.advanceSimTime(tripId, hours));
    }
}
