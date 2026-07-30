INSERT INTO customers (name, email, created_at)
SELECT * FROM (VALUES
    ('John Smith',    'john.smith@example.com',    now()),
    ('Jane Doe',      'jane.doe@example.com',      now()),
    ('Bob Johnson',   'bob.johnson@example.com',   now()),
    ('Alice Williams','alice.williams@example.com', now()),
    ('Charlie Brown', 'charlie.brown@example.com', now()),
    ('Diana Prince',  'diana.prince@example.com',  now()),
    ('Eve Davis',     'eve.davis@example.com',     now()),
    ('Frank Miller',  'frank.miller@example.com',  now())
) AS data(name, email, created_at)
WHERE NOT EXISTS (SELECT 1 FROM customers LIMIT 1);
