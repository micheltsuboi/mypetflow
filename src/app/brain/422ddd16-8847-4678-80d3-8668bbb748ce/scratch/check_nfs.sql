SELECT id, status, created_at FROM notas_fiscais WHERE org_id = (SELECT org_id FROM profiles WHERE id = '3318b871-3318-4720-94d7-013098363765') ORDER BY created_at DESC LIMIT 10;
