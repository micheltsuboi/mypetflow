const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const orgId = '289c053b-16c7-45d7-96ec-43e18ef96571';
  
  // Get recent orders
  const { data: orders } = await supabase.from('orders')
    .select('id, total_amount, payment_status, created_at, financial_transaction_id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log("RECENT ORDERS:");
  console.table(orders);

  // Get recent income transactions
  const { data: txs } = await supabase.from('financial_transactions')
    .select('id, amount, date, reference_id, type')
    .eq('org_id', orgId)
    .eq('type', 'income')
    .order('date', { ascending: false })
    .limit(5);

  console.log("\nRECENT INCOME TRANSACTIONS:");
  console.table(txs);
}
main();
