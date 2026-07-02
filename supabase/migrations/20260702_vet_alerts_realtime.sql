-- Enable Realtime for vet_alerts table
-- This allows the frontend to receive updates and avoids high CPU polling
begin;
  -- Add table to the supabase_realtime publication
  alter publication supabase_realtime add table public.vet_alerts;
  
  -- Set replica identity to full to ensure all columns (including org_id) 
  -- are sent in UPDATE/DELETE events for realtime filtering
  alter table public.vet_alerts replica identity full;
commit;
