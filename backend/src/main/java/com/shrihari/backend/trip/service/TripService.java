package com.shrihari.backend.trip.service;

import com.shrihari.backend.common.IdGenerator;
import com.shrihari.backend.common.exception.ResourceNotFoundException;
import com.shrihari.backend.trip.dto.TripCreateRequest;
import com.shrihari.backend.trip.dto.TripResponse;
import com.shrihari.backend.trip.model.Trip;
import com.shrihari.backend.trip.model.TripStatus;
import com.shrihari.backend.trip.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;

    @Transactional
    public TripResponse createTrip(TripCreateRequest request) {
        String tripId = (request.getTripId() != null && !request.getTripId().trim().isEmpty())
                ? request.getTripId().trim()
                : IdGenerator.generateId("trip");

        String currency = (request.getCurrency() != null && !request.getCurrency().trim().isEmpty())
                ? request.getCurrency().trim().toUpperCase()
                : "USD";

        String name = (request.getName() != null && !request.getName().trim().isEmpty())
                ? request.getName().trim()
                : "Trip " + tripId;

        Trip trip = Trip.builder()
                .id(tripId)
                .name(name)
                .currency(currency)
                .status(TripStatus.ACTIVE)
                .createdAt(Instant.now())
                .build();

        Trip saved = tripRepository.save(trip);
        return TripResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public TripResponse getTripById(String tripId) {
        Trip trip = findTripEntity(tripId);
        return TripResponse.fromEntity(trip);
    }

    @Transactional(readOnly = true)
    public Trip findTripEntity(String tripId) {
        return tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id: " + tripId));
    }

    @Transactional(readOnly = true)
    public List<TripResponse> getAllTrips() {
        return tripRepository.findAll().stream()
                .map(TripResponse::fromEntity)
                .toList();
    }
}
