const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const orgId = '289c053b-16c7-45d7-96ec-43e18ef96571';
    
    // Simulate Financeiro exactly
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: appointments } = await supabase.from('appointments').select('*').eq('org_id', orgId);
    const { data: transactions } = await supabase.from('financial_transactions').select('*').eq('org_id', orgId);
    const { data: paidSales } = await supabase.from('orders').select('*').eq('org_id', orgId).eq('payment_status', 'paid');
    const { data: paidPackages } = await supabase.from('customer_packages').select('*').eq('org_id', orgId).eq('payment_status', 'paid');

    const filterByPeriod = (dateStr) => {
        if (!dateStr) return false
        const d = new Date(dateStr)
        const start = new Date(startDate + 'T00:00:00')
        const end = new Date(endDate + 'T23:59:59')
        return d >= start && d <= end
    }

    const activeAppts = appointments.filter((a) => filterByPeriod(a.payment_status === 'paid' ? a.paid_at : a.scheduled_at))
    const activeTxs = transactions.filter((t) => filterByPeriod(t.date))
    const activePaidSales = paidSales.filter((s) => filterByPeriod(s.created_at))
    const activePaidPackages = paidPackages.filter((p) => filterByPeriod(p.created_at))

    const idsToSkip = new Set([
        ...activeTxs.filter(t => t.type === 'income' && t.reference_id).map(t => t.reference_id),
        ...paidSales.filter((s) => !!s.financial_transaction_id).map((s) => s.id),
        ...appointments.filter((a) => !!(a).financial_transaction_id).map((a) => a.id),
        ...paidPackages.filter((p) => !!(p).financial_transaction_id).map((p) => p.id)
    ])
    
    let totalRev = 0;
    
    activeAppts.forEach((a) => {
        const amount = Number(a.final_price || a.calculated_price || 0)
        if (idsToSkip.has(a.id)) return
        if (a.payment_status === 'paid') {
            totalRev += amount
        }
    })

    activeTxs.forEach((t) => {
        const amount = Number(t.amount || 0)
        if (t.type === 'income') {
            totalRev += amount
        }
    })

    activePaidSales.forEach((s) => {
        if (idsToSkip.has(s.id)) return
        const amount = Number(s.total_amount || 0)
        totalRev += amount
    })

    activePaidPackages.forEach((p) => {
        if (idsToSkip.has(p.id)) return
        const amount = Number(p.total_paid || p.total_price || 0)
        totalRev += amount
    })

    console.log("Financeiro totalRev is:", totalRev);
}
main();
