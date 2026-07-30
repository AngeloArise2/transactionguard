package com.transactionguard.service;

import com.transactionguard.dto.TransactionRequestDto;
import com.transactionguard.dto.TransactionResponseDto;
import com.transactionguard.entity.Transaction;
import com.transactionguard.exception.ResourceNotFoundException;
import com.transactionguard.repository.TransactionRepository;
import com.transactionguard.service.AnomalyDetectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AnomalyDetectionService anomalyDetectionService;

    @Transactional
    public TransactionResponseDto create(TransactionRequestDto request) {
        Transaction transaction = Transaction.builder()
                .customerId(request.customerId())
                .amount(request.amount())
                .merchant(request.merchant())
                .category(request.category())
                .occurredAt(Instant.now())
                .build();
        transaction = transactionRepository.save(transaction);
        transaction = anomalyDetectionService.checkAndScore(transaction);
        return toDto(transaction);
    }

    public TransactionResponseDto findById(Long id) {
        return toDto(transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", id)));
    }

    public List<TransactionResponseDto> findByCustomerId(Long customerId) {
        return transactionRepository.findByCustomerIdOrderByOccurredAtDesc(customerId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private TransactionResponseDto toDto(Transaction transaction) {
        return new TransactionResponseDto(
                transaction.getId(),
                transaction.getCustomerId(),
                transaction.getAmount(),
                transaction.getMerchant(),
                transaction.getCategory(),
                transaction.getOccurredAt(),
                transaction.isFlagged(),
                transaction.getFlagReason()
        );
    }
}
