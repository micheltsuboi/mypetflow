-- Adicionar colunas de horário de trabalho em profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS lunch_start_time TIME DEFAULT '12:00',
ADD COLUMN IF NOT EXISTS lunch_end_time TIME DEFAULT '13:00',
ADD COLUMN IF NOT EXISTS work_end_time TIME DEFAULT '18:00';

-- Adicionar índice para melhorar performance de consultas por período no ponto
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON public.time_entries(clock_in);

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.work_start_time IS 'Horário previsto de entrada';
COMMENT ON COLUMN public.profiles.lunch_start_time IS 'Início previsto do intervalo';
COMMENT ON COLUMN public.profiles.lunch_end_time IS 'Fim previsto do intervalo';
COMMENT ON COLUMN public.profiles.work_end_time IS 'Horário previsto de saída';
