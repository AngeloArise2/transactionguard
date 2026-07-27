package com.transactionguard.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record TransactionResponseDto(
    Long id,
    Long customerId,
    BigDecimal amount,
    String merchant,
    String category,
    Instant occurredAt,
    boolean flagged,
    String flagReason
) {}
