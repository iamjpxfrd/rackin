package com.rackin.backend.model;

// Lowercase constant names so EnumType.STRING persistence and default Jackson
// (de)serialization both match the API/schema contract's lowercase values verbatim.
public enum CheckInMethod {
    numpad,
    qr,
    search
}
