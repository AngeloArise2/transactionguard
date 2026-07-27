-- Using flag columns directly on the `transactions` table rather than a separate
-- `flagged_transactions` table. This avoids an extra join for every flagged-tx
-- lookup and keeps the anomaly detection workflow atomic (persist + flag in one row).

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
