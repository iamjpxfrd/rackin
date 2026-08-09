package com.rackin.backend.exception;

public class MemberNotFoundException extends RuntimeException {

    public MemberNotFoundException(String memberId) {
        // Message matches the frontend's error string exactly (TRD Section 5 / PRD 4.1 AC3).
        super("No member found for #" + memberId);
    }
}
