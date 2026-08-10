package com.rackin.backend.web.dto;

public record CheckInResponse(MemberBrief member, long visitCountThisMonth) {
}
