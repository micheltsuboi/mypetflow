-- Service Categories Migration
-- Creates service_categories table and updates services table

-- Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL, -- hex color
    icon VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO service_categories (name, color, icon) VALUES
    ('Banho e Tosa', '#3B82F6', '🚿'),
    ('Creche', '#10B981', '🎾'),
    ('Hospedagem', '#F97316', '🏨');

-- Add category_id to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES service_categories(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);

-- Update existing services to default to "Banho e Tosa" category
-- (You can manually update these later based on actual service types)
UPDATE services 
SET category_id = (SELECT id FROM service_categories WHERE name = 'Banho e Tosa')
WHERE category_id IS NULL;
