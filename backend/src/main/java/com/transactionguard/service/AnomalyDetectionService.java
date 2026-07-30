package com.transactionguard.service;

import com.transactionguard.entity.Transaction;
import com.transactionguard.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnomalyDetectionService {

    private final StringRedisTemplate redisTemplate;
    private final TransactionRepository transactionRepository;

    @Value("${app.anomaly.threshold-multiplier}")
    private double thresholdMultiplier;

    @Value("${app.anomaly.ema-alpha}")
    private double emaAlpha;

    @Transactional
    public Transaction checkAndScore(Transaction transaction) {
        String key = "customer:" + transaction.getCustomerId() + ":avg";
        String stored = redisTemplate.opsForValue().get(key);

        if (stored == null) {
            redisTemplate.opsForValue().set(key, transaction.getAmount().toPlainString());
            return transaction;
        }

        double currentAvg = Double.parseDouble(stored);
        double amount = transaction.getAmount().doubleValue();

        if (amount > currentAvg * thresholdMultiplier) {
            double multiple = amount / currentAvg;
            transaction.setFlagged(true);
            transaction.setFlagReason(String.format("Amount is %.1fx customer's rolling average", multiple));
        }

        double newAvg = (emaAlpha * amount) + ((1 - emaAlpha) * currentAvg);
        redisTemplate.opsForValue().set(key, String.valueOf(newAvg));

        return transactionRepository.save(transaction);
    }
}
