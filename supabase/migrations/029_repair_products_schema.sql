-- Repair products table schema to match application expectations and fix missing/conflicting columns
DO $$ 
BEGIN
    -- Handle selling_price vs price mismatch
    -- If selling_price exists, migrate data to price and drop it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='selling_price') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='price') THEN
            -- Only selling_price exists, rename it to price
            ALTER TABLE public.products RENAME COLUMN selling_price TO price;
        ELSE
            -- Both exist, migrate and drop selling_price
            UPDATE public.products SET price = selling_price WHERE price = 0 OR price IS NULL;
            ALTER TABLE public.products DROP COLUMN selling_price;
        END IF;
    END IF;

    -- Ensure price column exists (the main cause of PGRST204 if missing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='price') THEN
        ALTER TABLE public.products ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0;
    ELSE
        -- Ensure it's NOT NULL and has a default
        ALTER TABLE public.products ALTER COLUMN price SET NOT NULL;
        ALTER TABLE public.products ALTER COLUMN price SET DEFAULT 0;
    END IF;

    -- Ensure cost_price exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cost_price') THEN
        ALTER TABLE public.products ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Ensure image_url exists (standardizing on image_url instead of photo_url)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_url') THEN
        ALTER TABLE public.products ADD COLUMN image_url TEXT;
    END IF;

    -- If photo_url exists, migrate data and drop it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='photo_url') THEN
        UPDATE public.products SET image_url = photo_url WHERE image_url IS NULL;
        ALTER TABLE public.products DROP COLUMN photo_url;
    END IF;

    -- Ensure bar_code exists (standardizing on bar_code with underscore)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='bar_code') THEN
        ALTER TABLE public.products ADD COLUMN bar_code TEXT;
    END IF;

    -- If barcode (no underscore) exists, migrate data and drop it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='barcode') THEN
        UPDATE public.products SET bar_code = barcode WHERE bar_code IS NULL;
        ALTER TABLE public.products DROP COLUMN barcode;
    END IF;

    -- Ensure expiration_date exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='expiration_date') THEN
        ALTER TABLE public.products ADD COLUMN expiration_date TIMESTAMPTZ;
    END IF;

    -- Ensure min_stock_alert exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='min_stock_alert') THEN
        ALTER TABLE public.products ADD COLUMN min_stock_alert INTEGER DEFAULT 5;
    END IF;

    -- Safety: ensure price is not null
    ALTER TABLE public.products ALTER COLUMN price SET NOT NULL;

END $$;
