-- Migration: update cashback rules and add transactions table
-- Generated on 2026-02-25

-- Add validity_months to rules
alter table cashback_rules 
add column validity_months integer not null default 2;

-- Remove old valid_until column (since we are switching logic)
alter table cashback_rules
drop column valid_until;

-- Create transactions table for individual earnings
create table cashback_transactions (
    id uuid primary key default uuid_generate_v4(),
    tutor_id uuid references customers(id) not null,
    org_id uuid references organizations(id) not null,
    order_id uuid references orders(id) on delete cascade,
    amount numeric not null default 0,
    original_amount numeric not null,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone default now()
);

-- Index for expiration lookups
create index idx_cashback_transactions_tutor_expiry on cashback_transactions(tutor_id, expires_at);
create index idx_cashback_transactions_org_id on cashback_transactions(org_id);
