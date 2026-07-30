package com.transactionguard.generator;

import com.transactionguard.dto.TransactionRequestDto;
import com.transactionguard.entity.Customer;
import com.transactionguard.repository.CustomerRepository;
import com.transactionguard.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Random;

@Component
@RequiredArgsConstructor
public class TransactionGeneratorService {

    private final CustomerRepository customerRepository;
    private final TransactionService transactionService;
    private final Random random = new Random();

    private static final List<String> MERCHANTS = List.of(
        "Amazon", "Uber", "Starbucks", "Local Grocery Mart",
        "Netflix", "Shell Gas Station", "Target", "DoorDash",
        "Whole Foods", "Best Buy", "CVS Pharmacy", "Walmart"
    );

    private static final List<String> CATEGORIES = List.of(
        "Shopping", "Transportation", "Food & Drink", "Groceries",
        "Entertainment", "Utilities", "Health", "Retail"
    );

    @Scheduled(fixedRateString = "${app.generator.interval-ms:5000}")
    public void generate() {
        List<Customer> customers = customerRepository.findAll();
        if (customers.isEmpty()) return;

        Customer customer = customers.get(random.nextInt(customers.size()));
        boolean isSpike = random.nextInt(18) == 0;

        BigDecimal baseAmount = BigDecimal.valueOf(20 + random.nextDouble() * 80);
        BigDecimal amount = isSpike
            ? baseAmount.multiply(BigDecimal.valueOf(6 + random.nextDouble() * 4))
            : baseAmount;

        String merchant = MERCHANTS.get(random.nextInt(MERCHANTS.size()));
        String category = CATEGORIES.get(random.nextInt(CATEGORIES.size()));

        var request = new TransactionRequestDto(
            customer.getId(),
            amount.setScale(2, RoundingMode.HALF_UP),
            merchant,
            category
        );

        transactionService.create(request);
    }
}
