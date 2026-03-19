-- =====================================================
-- MIGRATION: Sincronização de Sessões ao Excluir Agendamentos
-- Garante que ao excluir um agendamento da agenda, a sessão 
-- do pacote volte para o status 'pending' ou correspondente.
-- =====================================================

-- 1. Função de trigger para lidar com exclusão de agendamento
CREATE OR REPLACE FUNCTION public.handle_package_session_on_appt_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza as sessões que estavam vinculadas a este agendamento
  UPDATE public.package_sessions
  SET 
    status = 'pending',
    appointment_id = NULL,
    scheduled_at = NULL
  WHERE appointment_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar o trigger na tabela appointments
DROP TRIGGER IF EXISTS on_appointment_delete_update_session ON public.appointments;
CREATE TRIGGER on_appointment_delete_update_session
AFTER DELETE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.handle_package_session_on_appt_delete();

-- 3. Garantir que o deleteAppointment na API funcione bem com isso
-- (O trigger já cuida da integridade no banco)
