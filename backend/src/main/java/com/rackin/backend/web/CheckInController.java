package com.rackin.backend.web;

import com.rackin.backend.service.CheckInService;
import com.rackin.backend.web.dto.CheckInRequest;
import com.rackin.backend.web.dto.CheckInResponse;
import com.rackin.backend.web.dto.LapsedMemberResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/checkins")
public class CheckInController {

    private final CheckInService checkInService;
    private final int defaultLapsedDays;

    public CheckInController(CheckInService checkInService,
                              @Value("${rackin.lapsed-days-default}") int defaultLapsedDays) {
        this.checkInService = checkInService;
        this.defaultLapsedDays = defaultLapsedDays;
    }

    @PostMapping
    public ResponseEntity<CheckInResponse> checkIn(@Valid @RequestBody CheckInRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(checkInService.checkIn(request));
    }

    @GetMapping("/lapsed")
    public List<LapsedMemberResponse> getLapsed(@RequestParam(required = false) Integer days) {
        return checkInService.getLapsed(days != null ? days : defaultLapsedDays);
    }
}
