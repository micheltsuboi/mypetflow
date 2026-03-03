-- Adicionar vínculo entre Prontuário e Consulta
ALTER TABLE public.vet_records 
ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES public.vet_consultations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vet_records_consultation ON public.vet_records(consultation_id);
