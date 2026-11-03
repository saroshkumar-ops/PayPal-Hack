package com.shrihari.backend.member.controller;

import com.shrihari.backend.member.dto.MemberCreateRequest;
import com.shrihari.backend.member.dto.MemberResponse;
import com.shrihari.backend.member.service.TripMemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Members", description = "Participant registration, roles (ORGANIZER/MEMBER), and roast consent settings")
@RestController
@RequestMapping("/api/trips/{tripId}/members")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TripMemberController {

    private final TripMemberService memberService;

    @Operation(summary = "Add member to trip", description = "Registers a new participant with PayPal email, Telegram handle, role, and roast consent tier")
    @PostMapping
    public ResponseEntity<MemberResponse> addMember(
            @PathVariable String tripId,
            @RequestBody MemberCreateRequest request) {

        MemberResponse response = memberService.addMember(tripId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "List trip members", description = "Retrieves all members registered for the given trip")
    @GetMapping
    public ResponseEntity<List<MemberResponse>> getMembers(@PathVariable String tripId) {
        return ResponseEntity.ok(memberService.getMembers(tripId));
    }
}
