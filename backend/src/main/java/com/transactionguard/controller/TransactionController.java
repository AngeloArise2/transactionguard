package com.transactionguard.controller;

import com.transactionguard.dto.TransactionRequestDto;
import com.transactionguard.dto.TransactionResponseDto;
import com.transactionguard.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponseDto create(@Valid @RequestBody TransactionRequestDto request) {
        return transactionService.create(request);
    }

    @GetMapping("/{id}")
    public TransactionResponseDto findById(@PathVariable Long id) {
        return transactionService.findById(id);
    }

    @GetMapping
    public List<TransactionResponseDto> findByCustomerId(@RequestParam Long customerId) {
        return transactionService.findByCustomerId(customerId);
    }
}
