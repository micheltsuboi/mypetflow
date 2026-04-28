-- Adicionar veterinário responsável ao agendamento
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS veterinarian_id UUID REFERENCES public.veterinarians(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_veterinarian ON public.appointments(veterinarian_id);
