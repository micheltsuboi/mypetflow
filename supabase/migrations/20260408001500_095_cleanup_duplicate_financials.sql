-- Limpeza de pacotes duplicados do Theo e outros pets que possam ter duplicidade de 'paid' no mesmo dia
-- Mantém apenas o registro mais recente de cada pacote pago por pet no mesmo dia
DELETE FROM customer_packages 
WHERE id IN (
    SELECT id 
    FROM (
        SELECT id, 
               ROW_NUMBER() OVER (
                   PARTITION BY pet_id, (created_at AT TIME ZONE 'UTC')::date 
                   ORDER BY created_at DESC
               ) as rn
        FROM customer_packages 
        WHERE payment_status = 'paid'
          AND total_paid > 0
    ) t
    WHERE t.rn > 1
);

-- Garantir que não existam transações duplicadas para o mesmo reference_id no mesmo dia
DELETE FROM financial_transactions
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY reference_id, type, (date AT TIME ZONE 'UTC')::date
                   ORDER BY created_at DESC
               ) as rn
        FROM financial_transactions
        WHERE reference_id IS NOT NULL
    ) t
    WHERE t.rn > 1
);
