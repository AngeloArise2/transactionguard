package com.transactionguard.service;

import com.transactionguard.dto.CustomerRequestDto;
import com.transactionguard.dto.CustomerResponseDto;
import com.transactionguard.entity.Customer;
import com.transactionguard.exception.ResourceNotFoundException;
import com.transactionguard.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;

    @Transactional
    public CustomerResponseDto create(CustomerRequestDto request) {
        Customer customer = Customer.builder()
                .name(request.name())
                .email(request.email())
                .createdAt(Instant.now())
                .build();
        return toDto(customerRepository.save(customer));
    }

    public CustomerResponseDto findById(Long id) {
        return toDto(customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", id)));
    }

    public Page<CustomerResponseDto> findAll(Pageable pageable) {
        return customerRepository.findAll(pageable).map(this::toDto);
    }

    @Transactional
    public CustomerResponseDto update(Long id, CustomerRequestDto request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", id));
        customer.setName(request.name());
        customer.setEmail(request.email());
        return toDto(customer);
    }

    @Transactional
    public void delete(Long id) {
        if (!customerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Customer", id);
        }
        customerRepository.deleteById(id);
    }

    private CustomerResponseDto toDto(Customer customer) {
        return new CustomerResponseDto(
                customer.getId(),
                customer.getName(),
                customer.getEmail(),
                customer.getCreatedAt()
        );
    }
}
