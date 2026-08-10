package com.rackin.backend.web.dto;

import com.rackin.backend.model.Member;
import com.rackin.backend.model.PlanType;

public record MemberBrief(String id, String name, PlanType planType) {

    public static MemberBrief from(Member member) {
        return new MemberBrief(member.getId(), member.getName(), member.getPlanType());
    }
}
