package com.shrihari.backend.expense.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemClaimDto {

    private String name;

    @JsonProperty("price_cents")
    private long priceCents;

    @JsonProperty("claimed_by_user_ids")
    private List<String> claimedByUserIds;
}
