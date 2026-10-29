package com.shrihari.backend.trip.repository;

import com.shrihari.backend.trip.model.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TripRepository extends JpaRepository<Trip, String> {
}
