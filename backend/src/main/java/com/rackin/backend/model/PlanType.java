package com.rackin.backend.model;

// Lowercase constant names so EnumType.STRING persistence and default Jackson
// (de)serialization both match the API/schema contract's lowercase values verbatim.
public enum PlanType {
    // A single-day drop-in: paid at the desk, trained once, left. A sale rather
    // than a membership, which is why Follow Up treats it differently.
    session,
    weekly,
    monthly,
    annually
}
