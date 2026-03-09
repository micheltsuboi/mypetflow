-- MIGRATION: 061_fix_hospital_fks.sql
-- Corrige as chaves estrangeiras para apontarem para public.profiles em vez de auth.users,
-- permitindo os JOINs (left e inner joins) no PostgREST (Supabase).

ALTER TABLE public.hospital_admissions 
  DROP CONSTRAINT IF EXISTS hospital_admissions_created_by_fkey;
ALTER TABLE public.hospital_admissions 
  ADD CONSTRAINT hospital_admissions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.hospital_medications 
  DROP CONSTRAINT IF EXISTS hospital_medications_created_by_fkey;
ALTER TABLE public.hospital_medications 
  ADD CONSTRAINT hospital_medications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.hospital_medication_logs 
  DROP CONSTRAINT IF EXISTS hospital_medication_logs_applied_by_fkey;
ALTER TABLE public.hospital_medication_logs 
  ADD CONSTRAINT hospital_medication_logs_applied_by_fkey FOREIGN KEY (applied_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.hospital_bed_movements 
  DROP CONSTRAINT IF EXISTS hospital_bed_movements_moved_by_fkey;
ALTER TABLE public.hospital_bed_movements 
  ADD CONSTRAINT hospital_bed_movements_moved_by_fkey FOREIGN KEY (moved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.hospital_observations 
  DROP CONSTRAINT IF EXISTS hospital_observations_created_by_fkey;
ALTER TABLE public.hospital_observations 
  ADD CONSTRAINT hospital_observations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
