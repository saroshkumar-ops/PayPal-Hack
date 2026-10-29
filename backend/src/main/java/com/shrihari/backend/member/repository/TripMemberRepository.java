package com.shrihari.backend.member.repository;

import com.shrihari.backend.member.model.TripMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TripMemberRepository extends JpaRepository<TripMember, String> {

    List<TripMember> findByTripIdOrderByJoinedAtAsc(String tripId);

    Optional<TripMember> findByTripIdAndUserId(String tripId, String userId);

    boolean existsByTripIdAndUserId(String tripId, String userId);
}
