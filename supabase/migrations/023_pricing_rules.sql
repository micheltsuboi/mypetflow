-- Create Pricing Rules table for services based on weight/attributes
create table if not exists public.pricing_rules (
    id uuid not null default gen_random_uuid(),
    service_id uuid not null references public.services(id) on delete cascade,
    org_id uuid not null references public.profiles(id), -- Assuming org linked via profile or organizations table, wait services has org_id
    min_weight numeric(5,2) not null default 0,
    max_weight numeric(5,2) not null default 999.99,
    price numeric(10,2) not null,
    created_at timestamptz default now(),
    
    constraint pricing_rules_pkey primary key (id),
    constraint pricing_rules_weight_check check (min_weight <= max_weight)
);

-- Add RLS
alter table public.pricing_rules enable row level security;

create policy "Users can view pricing rules of their org"
    on public.pricing_rules for select
    using (
        exists (
            select 1 from public.services s
            where s.id = pricing_rules.service_id
            and s.org_id = (select org_id from public.profiles where id = auth.uid())
        )
    );

create policy "Users can manage pricing rules of their org"
    on public.pricing_rules for all
    using (
        exists (
            select 1 from public.services s
            where s.id = pricing_rules.service_id
            and s.org_id = (select org_id from public.profiles where id = auth.uid())
        )
    );


-- Add calculated_price to appointments to lock in the price at booking time
alter table public.appointments 
add column if not exists calculated_price numeric(10,2);
