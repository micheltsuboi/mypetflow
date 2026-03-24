-- Create produtos_fiscal table for NFe

create table if not exists public.produtos_fiscal (
  produto_id uuid primary key references public.products(id) on delete cascade,
  codigo_ncm text not null,
  cfop text not null default '5102',
  icms_situacao_tributaria text default '400',
  icms_origem text default '0',
  pis_situacao_tributaria text default '07',
  cofins_situacao_tributaria text default '07',
  unidade_comercial text default 'un',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.produtos_fiscal enable row level security;

-- We join with products to get org_id for policies
create policy "Users can view their organization's produtos_fiscal"
  on public.produtos_fiscal for select
  using (
    produto_id in (
      select p.id from public.products p
      where p.org_id in (
        select om.org_id from public.organization_members om where om.user_id = auth.uid()
      )
    )
  );

create policy "Users can insert their organization's produtos_fiscal"
  on public.produtos_fiscal for insert
  with check (
    produto_id in (
      select p.id from public.products p
      where p.org_id in (
        select om.org_id from public.organization_members om where om.user_id = auth.uid()
      )
    )
  );

create policy "Users can update their organization's produtos_fiscal"
  on public.produtos_fiscal for update
  using (
    produto_id in (
      select p.id from public.products p
      where p.org_id in (
        select om.org_id from public.organization_members om where om.user_id = auth.uid()
      )
    )
  );

create policy "Users can delete their organization's produtos_fiscal"
  on public.produtos_fiscal for delete
  using (
    produto_id in (
      select p.id from public.products p
      where p.org_id in (
        select om.org_id from public.organization_members om where om.user_id = auth.uid()
      )
    )
  );

-- Trigger updated_at
create trigger set_produtos_fiscal_updated_at
  before update on public.produtos_fiscal
  for each row
  execute function public.handle_updated_at();

-- Add types definitions to supabase generated types (This must be updated via supabase cli, we just create the schema here)
