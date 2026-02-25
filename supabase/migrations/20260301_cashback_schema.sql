-- Migration: create cashbacks and cashback_rules tables
-- Generated on 2026-02-25

create extension if not exists "uuid-ossp";

create table cashbacks (
    id uuid primary key default uuid_generate_v4(),
    tutor_id uuid references customers(id) not null,
    balance numeric not null default 0,
    updated_at timestamp with time zone default now()
);

create table cashback_rules (
    id uuid primary key default uuid_generate_v4(),
    org_id uuid references organizations(id) not null,
    type text check (type in ('product','category')) not null,
    target_id uuid not null,
    percent numeric not null check (percent >= 0 and percent <= 100),
    valid_until timestamp with time zone,
    created_by uuid references profiles(id),
    created_at timestamp with time zone default now()
);

-- Indexes for quick lookup
create index idx_cashbacks_tutor_id on cashbacks(tutor_id);
create index idx_cashback_rules_org_id on cashback_rules(org_id);
