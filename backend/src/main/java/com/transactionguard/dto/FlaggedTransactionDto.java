package com.transactionguard.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record FlaggedTransactionDto(
    Long transactionId,
    String customerName,
    BigDecimal amount,
    String merchant,
    String reason,
    Instant timestamp
) {}
