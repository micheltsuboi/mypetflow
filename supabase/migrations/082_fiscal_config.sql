-- Migrate to create fiscal config table

create table if not exists public.fiscal_config (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.organizations(id) on delete cascade not null,
  focus_empresa_id text,
  token_producao text,
  token_homologacao text,
  ambiente text default 'homologacao',
  cnpj text,
  razao_social text,
  inscricao_municipal text,
  inscricao_estadual text,
  regime_tributario int default 1,
  optante_simples_nacional boolean default true,
  codigo_municipio text,
  municipio text,
  uf text,
  cep text,
  item_lista_servico text,
  aliquota_iss decimal default 2.00,
  codigo_tributario_municipio text,
  habilita_nfse boolean default false,
  habilita_nfe boolean default false,
  certificado_base64 text,
  senha_certificado text,
  certificado_valido_ate timestamp with time zone,
  ativo boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(org_id)
);

-- RLS
alter table public.fiscal_config enable row level security;

create policy "Users can view their organization's fiscal config"
  on public.fiscal_config for select
  using (org_id in (
    select org_id from public.organization_members where user_id = auth.uid()
  ));

create policy "Owners can insert their organization's fiscal config"
  on public.fiscal_config for insert
  with check (org_id in (
    select org_id from public.organization_members where user_id = auth.uid() and role = 'owner'
  ));

create policy "Owners can update their organization's fiscal config"
  on public.fiscal_config for update
  using (org_id in (
    select org_id from public.organization_members where user_id = auth.uid() and role = 'owner'
  ));

-- Functions
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_fiscal_config_updated_at
  before update on public.fiscal_config
  for each row
  execute function public.handle_updated_at();
