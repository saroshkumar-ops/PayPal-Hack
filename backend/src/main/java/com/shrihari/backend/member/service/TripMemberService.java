package com.shrihari.backend.member.service;

import com.shrihari.backend.common.IdGenerator;
import com.shrihari.backend.common.exception.ResourceNotFoundException;
import com.shrihari.backend.member.dto.MemberCreateRequest;
import com.shrihari.backend.member.dto.MemberResponse;
import com.shrihari.backend.member.model.MemberRole;
import com.shrihari.backend.member.model.RoastConsent;
import com.shrihari.backend.member.model.TripMember;
import com.shrihari.backend.member.repository.TripMemberRepository;
import com.shrihari.backend.trip.service.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TripMemberService {

    private final TripMemberRepository memberRepository;
    private final TripService tripService;

    @Transactional
    public MemberResponse addMember(String tripId, MemberCreateRequest request) {
        // Verify trip exists
        tripService.findTripEntity(tripId);

        String userId = (request.getUserId() != null && !request.getUserId().trim().isEmpty())
                ? request.getUserId().trim()
                : IdGenerator.generateId("user");

        // If member already exists in this trip, update details
        TripMember member = memberRepository.findByTripIdAndUserId(tripId, userId)
                .orElse(TripMember.builder()
                        .id(tripId + "_" + userId)
                        .tripId(tripId)
                        .userId(userId)
                        .joinedAt(Instant.now())
                        .build());

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            member.setName(request.getName().trim());
        } else if (member.getName() == null) {
            member.setName(userId);
        }

        if (request.getHandle() != null) {
            member.setHandle(request.getHandle().trim());
        }
        if (request.getPaypalEmail() != null) {
            member.setPaypalEmail(request.getPaypalEmail().trim());
        }
        if (request.getRole() != null) {
            member.setRole(MemberRole.fromString(request.getRole()));
        }
        if (request.getRoastConsent() != null) {
            member.setRoastConsent(RoastConsent.fromString(request.getRoastConsent()));
        }

        TripMember saved = memberRepository.save(member);
        return MemberResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> getMembers(String tripId) {
        tripService.findTripEntity(tripId);
        return memberRepository.findByTripIdOrderByJoinedAtAsc(tripId).stream()
                .map(MemberResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public TripMember findMemberEntity(String tripId, String userId) {
        return memberRepository.findByTripIdAndUserId(tripId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Member " + userId + " not found in trip " + tripId));
    }

    @Transactional
    public void ensureMemberExists(String tripId, String userId) {
        if (!memberRepository.existsByTripIdAndUserId(tripId, userId)) {
            TripMember member = TripMember.builder()
                    .id(tripId + "_" + userId)
                    .tripId(tripId)
                    .userId(userId)
                    .name(userId)
                    .role(MemberRole.MEMBER)
                    .roastConsent(RoastConsent.MILD)
                    .joinedAt(Instant.now())
                    .build();
            memberRepository.save(member);
        }
    }
}
