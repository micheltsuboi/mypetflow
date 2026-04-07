-- Reset total_paid for packages created today that were affected by the transition logic
-- (Saving contract price into total_paid instead of 0)
UPDATE public.customer_packages
SET total_paid = 0
WHERE payment_status = 'pending' 
  AND created_at >= '2026-04-07 00:00:00'
  AND total_price = total_paid
  AND total_price > 0;

-- Now mark as 'paid' all customer packages where total_paid is greater than or equal to total_price
-- and they were created BEFORE today (to avoid overlapping with the reset above)
-- OR they are already paid.
UPDATE public.customer_packages
SET payment_status = 'paid'
WHERE payment_status = 'pending' 
  AND total_price > 0 
  AND total_paid >= total_price
  AND created_at < '2026-04-07 00:00:00';

-- Standardize total_price
UPDATE public.customer_packages
SET total_price = total_paid
WHERE total_price IS NULL AND total_paid > 0;
