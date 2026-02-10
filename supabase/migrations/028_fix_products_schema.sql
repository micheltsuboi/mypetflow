-- Add min_stock_alert column to products table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'min_stock_alert'
    ) THEN
        ALTER TABLE public.products ADD COLUMN min_stock_alert INTEGER DEFAULT 5;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'expiration_date'
    ) THEN
        ALTER TABLE public.products ADD COLUMN expiration_date DATE;
    END IF;
END $$;
