-- Migration to add total_price to customer_packages to store the contract value
ALTER TABLE public.customer_packages
ADD COLUMN IF NOT EXISTS total_price NUMERIC(15, 2);

-- Update existing records: if total_price is null, use total_paid value
UPDATE public.customer_packages
SET total_price = total_paid
WHERE total_price IS NULL;

-- Also update the sellPackageToPet logic to correctly handle pending status
-- We already have the server actions, so let's make sure the DB is ready for the price field.
