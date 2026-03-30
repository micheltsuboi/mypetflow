-- Enable Realtime for notas_fiscais table
-- This allows the frontend to receive updates when the status or details change
begin;
  -- Add table to the supabase_realtime publication
  alter publication supabase_realtime add table public.notas_fiscais;
  
  -- Set replica identity to full to ensure all columns (including org_id) 
  -- are sent in UPDATE/DELETE events for realtime filtering
  alter table public.notas_fiscais replica identity full;
commit;
