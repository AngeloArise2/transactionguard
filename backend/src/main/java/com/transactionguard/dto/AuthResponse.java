package com.transactionguard.dto;

public record AuthResponse(
    String token,
    Long expiresAt
) {}
