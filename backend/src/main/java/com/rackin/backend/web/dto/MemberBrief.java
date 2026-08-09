package com.rackin.backend.web.dto;

import com.rackin.backend.model.PlanType;

public record MemberBrief(String id, String name, PlanType planType) {
}
