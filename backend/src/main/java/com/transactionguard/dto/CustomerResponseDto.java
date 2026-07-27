package com.transactionguard.dto;

import java.time.Instant;

public record CustomerResponseDto(
    Long id,
    String name,
    String email,
    Instant createdAt
) {}
