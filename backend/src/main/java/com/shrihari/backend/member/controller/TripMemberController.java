package com.shrihari.backend.member.controller;

import com.shrihari.backend.member.dto.MemberCreateRequest;
import com.shrihari.backend.member.dto.MemberResponse;
import com.shrihari.backend.member.service.TripMemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips/{tripId}/members")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TripMemberController {

    private final TripMemberService memberService;

    @PostMapping
    public ResponseEntity<MemberResponse> addMember(
            @PathVariable String tripId,
            @RequestBody MemberCreateRequest request) {
        MemberResponse response = memberService.addMember(tripId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<MemberResponse>> getMembers(@PathVariable String tripId) {
        return ResponseEntity.ok(memberService.getMembers(tripId));
    }
}
