package com.transactionguard.controller;

import com.transactionguard.dto.CustomerRequestDto;
import com.transactionguard.dto.CustomerResponseDto;
import com.transactionguard.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerResponseDto create(@Valid @RequestBody CustomerRequestDto request) {
        return customerService.create(request);
    }

    @GetMapping("/{id}")
    public CustomerResponseDto findById(@PathVariable Long id) {
        return customerService.findById(id);
    }

    @GetMapping
    public Page<CustomerResponseDto> findAll(Pageable pageable) {
        return customerService.findAll(pageable);
    }

    @PutMapping("/{id}")
    public CustomerResponseDto update(@PathVariable Long id, @Valid @RequestBody CustomerRequestDto request) {
        return customerService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        customerService.delete(id);
    }
}
