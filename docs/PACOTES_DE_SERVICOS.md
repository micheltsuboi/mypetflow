# Sistema de Pacotes de Serviços - SR PET CLUBE

## 📋 Visão Geral

O Sistema de Pacotes de Serviços permite que o pet shop ofereça pacotes mensais personalizados aos clientes. 

### Características principais:

1. **Pacotes Customizáveis**: O proprietário define nome, preço e composição (ex: "Pacote Mensal Premium" = 4 banhos + 2 tosas)
2. **Créditos Acumulativos**: Serviços não utilizados transferem automaticamente para o próximo mês
3. **Integração com Agenda**: Cada serviço do pacote pode ser agendado normalmente no sistema
4. **Rastreamento Completo**: Monitor de uso e saldo de cada tipo de serviço no pacote
5. **Validade Flexível**: Pacotes podem ter data de expiração ou serem perpétuos

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

#### `service_packages` - Templates de Pacotes
Define os pacotes oferecidos pelo pet shop.
- `name`: Nome do pacote (ex: "Pacote Mensal Premium")
- `total_price`: Preço único do pacote
- `validity_days`: Dias de validade (NULL = sem expiração)
- `is_active`: Se o pacote está disponível para venda

#### `package_items` - Composição dos Pacotes
Define quais serviços e quantidades compõem cada pacote.
- `package_id`: Referência ao template do pacote
- `service_id`: Referência ao serviço
- `quantity`: Quantidade deste serviço no pacote

#### `customer_packages` - Pacotes Comprados
Registra quando um cliente compra um pacote.
- `customer_id`: Cliente que comprou
- `package_id`: Template do pacote comprado
- `purchased_at`: Data da compra
- `expires_at`: Data de expiração (calculada automaticamente)
- `total_paid`: Valor pago
- `payment_method`: Forma de pagamento
- `is_active`: Se o pacote está ativo

#### `package_credits` - Saldo de Serviços
Rastreia quantos créditos de cada serviço o cliente tem.
- `customer_package_id`: Pacote comprado
- `service_id`: Serviço
- `total_quantity`: Quantidade original
- `used_quantity`: Quantidade já utilizada
- `remaining_quantity`: Quantidade restante

### Funções SQL

#### `use_package_credit(customer_id, service_id)`
Usa um crédito de pacote ao criar um agendamento.
- Prioriza pacotes que expiram primeiro
- Decrementa automaticamente o saldo
- Retorna o ID do crédito usado

#### `return_package_credit(credit_id)`
Devolve um crédito quando um agendamento é cancelado.

#### `get_customer_package_summary(customer_id)`
Retorna resumo completo dos pacotes de um cliente.

## 📦 Como Aplicar a Migration

### Opção 1: Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Abra o arquivo `supabase/migrations/012_service_packages_complete.sql`
5. Copie todo o conteúdo
6. Cole no editor SQL
7. Clique em **Run**

### Opção 2: Supabase CLI (Se instalado)

```bash
npx supabase db push
```

## 🎯 Fluxo de Uso

### Para o Proprietário (Owner)

1. **Criar Pacote**:
   - Acesse **📦 Pacotes** no dashboard
   - Clique em **+ Novo Pacote**
   - Defina nome, preço e validade
   - Adicione serviços e quantidades
   - Salve

2. **Gerenciar Pacotes**:
   - Ativar/Desativar pacotes
   - Editar valores e composição
   - Visualizar pacotes vendidos

### Para a Equipe (Staff)

1. **Vender Pacote**:
   - Selecionar cliente
   - Escolher pacote disponível
   - Registrar pagamento
   - Sistema cria créditos automaticamente

2. **Agendar Serviço com Pacote**:
   - Ao criar agendamento, sistema verifica se cliente tem créditos
   - Se tiver, desconta automaticamente
   - Se não, cobra valor normal

3. **Renovar Pacote**:
   - Sistema transfere créditos não utilizados
   - Adiciona novos créditos do pacote
   - Atualiza data de validade

## 🔗 Integração com Agendamentos

A tabela `appointments` foi atualizada com o campo:
- `package_credit_id`: Referência ao crédito de pacote usado

Quando um agendamento é criado:
1. Sistema verifica se cliente tem créditos daquele serviço
2. Se sim, usa a função `use_package_credit()`
3. Vincula o agendamento ao crédito
4. Se cancelado, devolve o crédito com `return_package_credit()`

## 📊 Views e Relatórios

### `active_packages_summary`
View que mostra resumo de todos os pacotes ativos:
- Nome do cliente
- Nome do pacote
- Data de compra e expiração
- Status (Ativo/Expirado/Sem expiração)
- Total de serviços e créditos restantes

## 🔐 Segurança (RLS)

Todas as políticas de Row Level Security foram configuradas:
- Usuários só veem pacotes da sua organização
- Admin pode criar/editar pacotes
- Staff pode vender e gerenciar pacotes de clientes
- Clientes (futuro) podem ver seus próprios pacotes

## 📝 Próximos Passos

1. ✅ Criar página de gerenciamento de pacotes (Owner)
2. 🔲 Criar interface de venda de pacotes (Staff)
3. 🔲 Integrar com sistema de agendamentos
4. 🔲 Criar relatórios de uso de pacotes
5. 🔲 Notificações de pacotes próximos ao vencimento
6. 🔲 Dashboard do cliente mostrando seus pacotes

## 🐛 Troubleshooting

### Migration falha ao executar

**Problema**: Erro ao criar tabelas ou funções.

**Solução**: Verifique se as tabelas já existem. Se sim, você pode precisar executar:
```sql
DROP TABLE IF EXISTS package_credits CASCADE;
DROP TABLE IF EXISTS customer_packages CASCADE;
DROP TABLE IF EXISTS package_items CASCADE;
DROP TABLE IF EXISTS service_packages CASCADE;
```
E depois executar a migration novamente.

### Créditos não estão sendo descontados

**Problema**: Ao criar agendamento, créditos de pacote não são usados.

**Solução**: Certifique-se de que:
1. A migration foi aplicada corretamente
2. O pacote do cliente está ativo (`is_active = true`)
3. O pacote não está expirado
4. Há créditos disponíveis (`remaining_quantity > 0`)

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação do projeto ou entre em contato com a equipe de desenvolvimento.

---

**Versão**: 1.0  
**Data**: Fevereiro 2026  
**Autor**: Equipe SR PET CLUBE
