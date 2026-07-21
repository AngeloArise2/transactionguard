# OPENCODE_SKILLS.md — Technical reference patterns for the build agent

This file is for the AGENT (opencode), not the human. It contains concrete, copy-adaptable code patterns for each technology in this stack. Where `AGENTS.md` tells you *what to build and in what order*, and `SKILLS.md` (the human-facing one) explains *why*, this file gives you the actual shape of the code to write so the implementation is consistent and correct on the first pass. Use these as templates — adapt names/fields to the actual entities in this project, don't paste them verbatim without adjusting.

---

## 1. `pom.xml` dependency block (Phase 1)

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-websocket</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-core</artifactId>
    </dependency>
    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-database-postgresql</artifactId>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.12.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.12.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

Check `mvnrepository.com` for the current stable `jjwt` version at build time rather than assuming `0.12.5` is still current.

---

## 2. `application.yml` template (Phase 1)

```yaml
spring:
  application:
    name: transactionguard
  datasource:
    url: jdbc:postgresql://localhost:5432/transactionguard
    username: tg_user
    password: tg_pass
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        format_sql: true
  flyway:
    enabled: true
    locations: classpath:db/migration
  data:
    redis:
      host: localhost
      port: 6379

server:
  port: 8080

app:
  jwt:
    secret: ${JWT_SECRET:change-this-in-.env-never-commit-a-real-secret}
    expiration-ms: 86400000
  anomaly:
    threshold-multiplier: 3.0
    ema-alpha: 0.3

logging:
  level:
    org.springframework.security: INFO
    com.transactionguard: DEBUG
```

---

## 3. JPA Entity pattern (Phase 1)

```java
@Entity
@Table(name = "transactions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String merchant;

    private String category;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "is_flagged", nullable = false)
    private boolean flagged = false;

    @Column(name = "flag_reason")
    private String flagReason;
}
```

Do NOT annotate a `@ManyToOne` relationship to `Customer` unless you actually need to navigate the object graph in Java — a plain `customerId` foreign key column is simpler and sufficient here, and avoids N+1 query surprises for a project this size. Document this choice in a comment if you deviate.

---

## 4. Flyway migration pattern (Phase 1)

`V1__init.sql`:
```sql
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    amount NUMERIC(12,2) NOT NULL,
    merchant VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    occurred_at TIMESTAMPTZ NOT NULL,
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    flag_reason VARCHAR(500)
);

CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_occurred_at ON transactions(occurred_at);
```

Naming convention: `V{n}__snake_case_description.sql`, sequential, never edit an already-applied migration — add a new one instead.

---

## 5. DTO + mapping pattern (Phase 2)

```java
// Request DTO
public record TransactionRequestDto(
    @NotNull Long customerId,
    @NotNull @Positive BigDecimal amount,
    @NotBlank String merchant,
    String category
) {}

// Response DTO
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
```

Use Java `record` types for DTOs — immutable, concise, and idiomatic for this purpose. Mapping happens explicitly in the service layer:

```java
private TransactionResponseDto toDto(Transaction t) {
    return new TransactionResponseDto(
        t.getId(), t.getCustomerId(), t.getAmount(), t.getMerchant(),
        t.getCategory(), t.getOccurredAt(), t.isFlagged(), t.getFlagReason()
    );
}
```

---

## 6. Global exception handler pattern (Phase 2)

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(err -> errors.put(err.getField(), err.getDefaultMessage()));
        return ResponseEntity.badRequest().body(errors);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneral(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of("error", "An unexpected error occurred"));
    }
}
```

---

## 7. JWT filter + security config pattern (Phase 3)

```java
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                     FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtUtil.isValid(token)) {
                String username = jwtUtil.extractUsername(token);
                var auth = new UsernamePasswordAuthenticationToken(username, null, List.of());
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        chain.doFilter(request, response);
    }
}
```

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
    http
        .csrf(csrf -> csrf.disable())
        .cors(Customizer.withDefaults())
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/**", "/ws/**").permitAll()
            .anyRequest().authenticated())
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
}

@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("http://localhost:4200"));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

---

## 8. Redis-backed rolling average pattern (Phase 5)

```java
@Service
@RequiredArgsConstructor
public class AnomalyDetectionService {

    private final StringRedisTemplate redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.anomaly.threshold-multiplier}")
    private double thresholdMultiplier;

    @Value("${app.anomaly.ema-alpha}")
    private double emaAlpha;

    public void checkAndScore(Transaction transaction) {
        String key = "customer:" + transaction.getCustomerId() + ":avg";
        String stored = redisTemplate.opsForValue().get(key);

        if (stored == null) {
            // First transaction for this customer — establish baseline, never flag.
            redisTemplate.opsForValue().set(key, transaction.getAmount().toPlainString());
            return;
        }

        double currentAvg = Double.parseDouble(stored);
        double amount = transaction.getAmount().doubleValue();

        if (amount > currentAvg * thresholdMultiplier) {
            double multiple = amount / currentAvg;
            transaction.setFlagged(true);
            transaction.setFlagReason(String.format("Amount is %.1fx customer's rolling average", multiple));
            messagingTemplate.convertAndSend("/topic/flagged-transactions", toFlaggedDto(transaction));
        }

        double newAvg = (emaAlpha * amount) + ((1 - emaAlpha) * currentAvg);
        redisTemplate.opsForValue().set(key, String.valueOf(newAvg));
    }
}
```

Call `checkAndScore(transaction)` AFTER the transaction is initially persisted (so it has an ID) but BEFORE returning the response — update the flagged fields, then save again, or use one transactional method that does both. Keep this atomic within a single `@Transactional` service method to avoid a half-saved state.

---

## 9. WebSocket config pattern (Phase 6)

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOrigins("http://localhost:4200")
            .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }
}
```

---

## 10. Scheduled generator pattern (Phase 4)

```java
@Component
@RequiredArgsConstructor
public class TransactionGeneratorService {

    private final CustomerRepository customerRepository;
    private final TransactionService transactionService;
    private final Random random = new Random();

    private static final List<String> MERCHANTS = List.of(
        "Amazon", "Uber", "Starbucks", "Local Grocery Mart",
        "Netflix", "Shell Gas Station", "Target", "DoorDash"
    );

    @Scheduled(fixedRateString = "${app.generator.interval-ms:5000}")
    public void generate() {
        List<Customer> customers = customerRepository.findAll();
        if (customers.isEmpty()) return;

        Customer customer = customers.get(random.nextInt(customers.size()));
        boolean isSpike = random.nextInt(18) == 0; // roughly 1 in 18

        BigDecimal baseAmount = BigDecimal.valueOf(20 + random.nextDouble() * 80); // $20-100 typical
        BigDecimal amount = isSpike
            ? baseAmount.multiply(BigDecimal.valueOf(6 + random.nextDouble() * 4)) // 6x-10x spike
            : baseAmount;

        var request = new TransactionRequestDto(
            customer.getId(),
            amount.setScale(2, RoundingMode.HALF_UP),
            MERCHANTS.get(random.nextInt(MERCHANTS.size())),
            "General"
        );

        transactionService.createTransaction(request);
    }
}
```

---

## 11. Angular WebSocket service pattern (Phase 8)

```typescript
import { Injectable, signal } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface FlaggedTransaction {
  transactionId: number;
  customerName: string;
  amount: number;
  merchant: string;
  reason: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private client: Client | null = null;
  readonly flaggedTransactions = signal<FlaggedTransaction[]>([]);

  connect(): void {
    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        this.client!.subscribe('/topic/flagged-transactions', (message) => {
          const flagged: FlaggedTransaction = JSON.parse(message.body);
          this.flaggedTransactions.update((list) => [flagged, ...list].slice(0, 50));
        });
      },
      reconnectDelay: 5000,
    });
    this.client.activate();
  }

  disconnect(): void {
    this.client?.deactivate();
  }
}
```

---

## 12. Angular HTTP interceptor pattern (Phase 7)

```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  return next(req);
};
```

Register in `app.config.ts`:
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
  ],
};
```

---

## 13. Testing checklist agent should run itself after each phase

- `mvn clean compile` — no compile errors
- `mvn spring-boot:run` — boots without exception in logs
- At least one `curl` call per new endpoint, output shown to the developer
- For frontend phases: `ng build` succeeds with no TypeScript errors, `ng serve` renders without console errors

Do not report a phase "done" without having actually run these, not just written the code.
