package com.shrihari.backend.demo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.shrihari.backend.expense.dto.ExpenseResponse;
import com.shrihari.backend.ledger.dto.LedgerResponse;
import com.shrihari.backend.member.dto.MemberResponse;
import com.shrihari.backend.trip.dto.TripResponse;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DemoSeedResponse {

    private String message;

    private TripResponse trip;

    @JsonProperty("member_ids")
    private List<String> memberIds;

    private List<MemberResponse> members;

    private List<ExpenseResponse> expenses;

    private LedgerResponse ledger;
}
