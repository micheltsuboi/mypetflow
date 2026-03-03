-- Adicionar vínculo entre Agendamento e Consulta Veterinária
ALTER TABLE public.vet_consultations 
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vet_consultations_appointment ON public.vet_consultations(appointment_id);
