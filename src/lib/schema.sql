-- ==============================================================================
-- DTF AUTO PRO — PostgreSQL / Supabase Schema (Multi-Tenant SaaS)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & TENANTS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    company TEXT,
    role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
    status TEXT NOT NULL DEFAULT 'trial', -- 'trial' | 'active' | 'suspended' | 'canceled'
    asaas_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active', -- 'trialing' | 'active' | 'overdue' | 'canceled'
    plan_name TEXT NOT NULL DEFAULT 'Plano Pro DTF Auto',
    price_monthly NUMERIC(10,2) NOT NULL DEFAULT 75.00,
    trial_started_at TIMESTAMPTZ DEFAULT NOW(),
    trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    current_period_end TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    pix_code TEXT,
    asaas_subscription_id TEXT,
    asaas_payment_id TEXT,
    last_payment_at TIMESTAMPTZ,
    next_due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PRODUCTS & CATEGORIES
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Camiseta',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SKUS & STAMP CATALOG
CREATE TABLE IF NOT EXISTS skus (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    sku TEXT NOT NULL,
    sku_aliases TEXT DEFAULT '',
    title TEXT NOT NULL,
    image_path TEXT NOT NULL,
    width_cm NUMERIC(6,2) NOT NULL,
    height_cm NUMERIC(6,2) NOT NULL,
    original_width_px INTEGER DEFAULT 0,
    original_height_px INTEGER DEFAULT 0,
    dpi_calculated NUMERIC(6,2) DEFAULT 300.0,
    has_transparency INTEGER DEFAULT 1,
    storage_bucket TEXT DEFAULT 'arts',
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PRINT QUEUES / METRO RECORDS
CREATE TABLE IF NOT EXISTS print_queues (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    roll_width_cm NUMERIC(6,2) NOT NULL DEFAULT 57.0,
    roll_height_cm NUMERIC(8,2) NOT NULL,
    margin_cm NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    spacing_cm NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    allow_rotation INTEGER NOT NULL DEFAULT 1,
    total_items INTEGER NOT NULL DEFAULT 0,
    efficiency_percent NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    estimated_savings_brl NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    saved_linear_cm NUMERIC(8,2) NOT NULL DEFAULT 0.0,
    highres_image_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. QUEUE PLACED ITEMS
CREATE TABLE IF NOT EXISTS queue_items (
    id TEXT PRIMARY KEY,
    queue_id TEXT NOT NULL REFERENCES print_queues(id) ON DELETE CASCADE,
    sku_id TEXT,
    sku_code TEXT NOT NULL,
    title TEXT NOT NULL,
    x_cm NUMERIC(6,2) NOT NULL,
    y_cm NUMERIC(8,2) NOT NULL,
    width_cm NUMERIC(6,2) NOT NULL,
    height_cm NUMERIC(6,2) NOT NULL,
    rotated INTEGER NOT NULL DEFAULT 0,
    rotation INTEGER NOT NULL DEFAULT 0,
    image_path TEXT NOT NULL,
    garment_info TEXT
);

-- 7. ORDER BATCHES
CREATE TABLE IF NOT EXISTS order_batches (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_filename TEXT NOT NULL,
    total_garments INTEGER NOT NULL DEFAULT 0,
    garments_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. DTF SETTINGS
CREATE TABLE IF NOT EXISTS dtf_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    roll_width_cm NUMERIC(6,2) NOT NULL DEFAULT 57.0,
    spacing_cm NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    margin_cm NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    allow_rotation INTEGER NOT NULL DEFAULT 1,
    default_adult_height_cm NUMERIC(6,2) NOT NULL DEFAULT 28.0,
    default_plussize_height_cm NUMERIC(6,2) NOT NULL DEFAULT 32.0,
    default_infant_height_cm NUMERIC(6,2) NOT NULL DEFAULT 18.0,
    default_moletom_height_cm NUMERIC(6,2) NOT NULL DEFAULT 30.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. CURRENT METRO SESSION
CREATE TABLE IF NOT EXISTS current_metro_session (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    roll_width_cm NUMERIC(6,2) NOT NULL DEFAULT 57.0,
    roll_height_cm NUMERIC(8,2) NOT NULL DEFAULT 100.0,
    margin_cm NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    spacing_cm NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    allow_rotation INTEGER NOT NULL DEFAULT 1,
    items_json TEXT NOT NULL DEFAULT '[]',
    placed_items_json TEXT NOT NULL DEFAULT '[]',
    source_filename TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. WEBHOOK & AUDIT EVENTS
CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'asaas',
    event_name TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    processed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_skus_user ON skus(user_id);
CREATE INDEX IF NOT EXISTS idx_skus_sku ON skus(sku);
CREATE INDEX IF NOT EXISTS idx_print_queues_user ON print_queues(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_items_queue ON queue_items(queue_id);
CREATE INDEX IF NOT EXISTS idx_order_batches_user ON order_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
