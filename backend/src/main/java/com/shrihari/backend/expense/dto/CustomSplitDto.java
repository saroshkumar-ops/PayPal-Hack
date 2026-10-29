package com.shrihari.backend.expense.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomSplitDto {

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("owes_cents")
    private Long owesCents;
}
