-- migration 040_unique_notifications.sql

-- Drop duplicates first, keeping the oldest one
DELETE FROM notifications a USING notifications b
  WHERE a.id > b.id
  AND a.org_id = b.org_id
  AND a.type = b.type
  AND a.reference_id = b.reference_id;

-- Add unique constraint
ALTER TABLE notifications
  ADD CONSTRAINT unique_notification_per_reference UNIQUE (org_id, type, reference_id);
