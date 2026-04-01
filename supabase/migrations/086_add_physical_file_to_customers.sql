-- Add physical_file_number to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS physical_file_number TEXT;

-- Index for searching by physical file number
CREATE INDEX IF NOT EXISTS idx_customers_physical_file_number ON customers(physical_file_number);
