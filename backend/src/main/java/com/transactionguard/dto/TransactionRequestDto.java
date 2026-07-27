package com.transactionguard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record TransactionRequestDto(
    @NotNull Long customerId,
    @NotNull @Positive BigDecimal amount,
    @NotBlank String merchant,
    String category
) {}
