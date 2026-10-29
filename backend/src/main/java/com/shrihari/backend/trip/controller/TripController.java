package com.shrihari.backend.trip.controller;

import com.shrihari.backend.trip.dto.TripCreateRequest;
import com.shrihari.backend.trip.dto.TripResponse;
import com.shrihari.backend.trip.service.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TripController {

    private final TripService tripService;

    @PostMapping
    public ResponseEntity<TripResponse> createTrip(@RequestBody TripCreateRequest request) {
        TripResponse response = tripService.createTrip(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<TripResponse>> getAllTrips() {
        return ResponseEntity.ok(tripService.getAllTrips());
    }

    @GetMapping("/{tripId}")
    public ResponseEntity<TripResponse> getTrip(@PathVariable String tripId) {
        return ResponseEntity.ok(tripService.getTripById(tripId));
    }
}
