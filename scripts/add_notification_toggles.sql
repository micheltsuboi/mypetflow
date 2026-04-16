-- Adiciona colunas para controle de notificações de vacina e mensalidade
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS notify_vaccine_reminder BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_subscription_reminder BOOLEAN DEFAULT TRUE;

-- Atualizar comentários para fins de documentação
COMMENT ON COLUMN organizations.notify_vaccine_reminder IS 'Ativa/Desativa o envio automático de lembrete de vacinação via n8n';
COMMENT ON COLUMN organizations.notify_subscription_reminder IS 'Ativa/Desativa o envio automático de lembrete de mensalidade/assinatura via n8n';
