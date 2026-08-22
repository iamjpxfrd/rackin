package com.rackin.backend.web;

import com.rackin.backend.exception.CheckInNotFoundException;
import com.rackin.backend.exception.MemberIdConflictException;
import com.rackin.backend.exception.MemberNotFoundException;
import com.rackin.backend.web.dto.ErrorMessage;
import com.rackin.backend.web.dto.FieldError;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MemberNotFoundException.class)
    public ResponseEntity<ErrorMessage> handleMemberNotFound(MemberNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorMessage(ex.getMessage()));
    }

    @ExceptionHandler(CheckInNotFoundException.class)
    public ResponseEntity<ErrorMessage> handleCheckInNotFound(CheckInNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorMessage(ex.getMessage()));
    }

    // 409 rather than 400: the request is well-formed and would have succeeded
    // against a different backend. The tablet's sync queue treats it as
    // permanent and stops retrying, which a 5xx would not do.
    @ExceptionHandler(MemberIdConflictException.class)
    public ResponseEntity<ErrorMessage> handleMemberIdConflict(MemberIdConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorMessage(ex.getMessage()));
    }

    // Field-level detail (TRD Section 8) so the frontend can surface specific guidance.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<List<FieldError>> handleValidation(MethodArgumentNotValidException ex) {
        List<FieldError> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> new FieldError(fe.getField(), fe.getDefaultMessage()))
                .toList();
        return ResponseEntity.badRequest().body(errors);
    }
}
