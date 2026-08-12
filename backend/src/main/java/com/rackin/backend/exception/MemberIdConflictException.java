package com.rackin.backend.exception;

// A tablet pushed a member id that another member already holds. Distinct from
// the id race MemberService retries: that one resolves itself on the next
// attempt, this one never will, because the id was assigned by a different
// device and no amount of retrying makes it free. Surfaced as 409 so the
// tablet's sync queue drops the record instead of retrying it forever.
public class MemberIdConflictException extends RuntimeException {

    public MemberIdConflictException(String memberId) {
        super("Member #" + memberId + " already exists and was registered elsewhere. "
                + "Re-register this member to give them a free number.");
    }
}
