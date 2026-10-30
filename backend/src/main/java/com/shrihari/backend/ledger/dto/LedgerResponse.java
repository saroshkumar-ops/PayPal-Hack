package com.shrihari.backend.ledger.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.shrihari.backend.expense.dto.ExpenseResponse;
import com.shrihari.backend.member.dto.MemberResponse;
import lombok.*;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LedgerResponse {

    @JsonProperty("trip_id")
    private String tripId;

    private String currency;

    private List<MemberResponse> members;

    private List<ExpenseResponse> expenses;

    @JsonProperty("net_balances_cents")
    private Map<String, Long> netBalancesCents;

    @JsonProperty("platform_escrow_cents")
    @Builder.Default
    private long platformEscrowCents = 0L;

    @JsonProperty("simplified_settlements")
    private List<SettlementTransaction> simplifiedSettlements;

    @JsonProperty("settlements")
    public List<SettlementTransaction> getSettlements() {
        return simplifiedSettlements;
    }
}
