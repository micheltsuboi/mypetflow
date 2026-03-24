-- Create notas_fiscais table

create table if not exists public.notas_fiscais (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.organizations(id) on delete cascade not null,
  referencia text not null unique,
  tipo text not null check (tipo in ('nfse', 'nfe')),
  status text not null default 'processando' check (status in ('processando', 'autorizado', 'cancelado', 'erro')),
  numero_nf text,
  serie text,
  chave_nf text,
  tomador_nome text,
  tomador_cpf_cnpj text,
  valor_total decimal(10, 2),
  caminho_xml text,
  caminho_pdf text,
  mensagem_sefaz text,
  origem_tipo text check (origem_tipo in ('atendimento', 'banho_tosa', 'creche', 'pdv')),
  origem_id uuid,
  payload_enviado jsonb,
  retorno_focus jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for querying by origin
create index if not exists idx_notas_fiscais_origem on public.notas_fiscais (origem_tipo, origem_id);

-- RLS
alter table public.notas_fiscais enable row level security;

create policy "Users can view their organization's notas_fiscais"
  on public.notas_fiscais for select
  using (org_id in (
    select org_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert their organization's notas_fiscais"
  on public.notas_fiscais for insert
  with check (org_id in (
    select org_id from public.profiles where id = auth.uid()
  ));

create policy "Owners/admins can update their organization's notas_fiscais"
  on public.notas_fiscais for update
  using (org_id in (
    select org_id from public.profiles where id = auth.uid()
  ));

-- Trigger updated_at
create trigger set_notas_fiscais_updated_at
  before update on public.notas_fiscais
  for each row
  execute function public.handle_updated_at();
