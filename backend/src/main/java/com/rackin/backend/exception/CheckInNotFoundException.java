package com.rackin.backend.exception;

import java.util.UUID;

public class CheckInNotFoundException extends RuntimeException {

    public CheckInNotFoundException(UUID checkInClientUuid) {
        super("No check-in found for clientUuid " + checkInClientUuid);
    }
}
