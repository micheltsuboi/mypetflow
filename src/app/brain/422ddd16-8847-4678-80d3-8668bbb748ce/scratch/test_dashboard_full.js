const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const orgId = '289c053b-16c7-45d7-96ec-43e18ef96571';
    const profile = { org_id: orgId };
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    // Exact queries from owner/page.tsx
    const currentMonthApptsPromise = supabase
        .from('appointments')
        .select('id, final_price, calculated_price, payment_status, paid_at, scheduled_at, services ( service_categories ( name ) )')
        .eq('org_id', profile.org_id)
        .gte('scheduled_at', startOfCurrentMonth)

    const prevMonthApptsPromise = supabase
        .from('appointments')
        .select('id, final_price, calculated_price, payment_status')
        .eq('org_id', profile.org_id)
        .gte('scheduled_at', new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString())
        .lt('scheduled_at', startOfCurrentMonth)

    const transactionsPromise = supabase
        .from('financial_transactions')
        .select('id, amount, type, date, reference_id')
        .eq('org_id', profile.org_id)
        .gte('date', startOfCurrentMonth)

    const pendingSalesPromise = supabase
        .from('orders')
        .select('id, total_amount')
        .eq('org_id', profile.org_id)
        .in('payment_status', ['pending', 'partial'])

    const allPendingApptsPromise = supabase
        .from('appointments')
        .select('id, final_price, calculated_price, payment_status, scheduled_at, pets ( name ), services ( name )')
        .eq('org_id', profile.org_id)
        .or('payment_status.neq.paid,payment_status.is.null')

    const paidPackagesThisMonthPromise = supabase
        .from('customer_packages')
        .select('id, total_price, total_paid, payment_status, created_at, pets ( name ), package_id ( name )')
        .eq('org_id', profile.org_id)
        .eq('payment_status', 'paid')
        .gte('created_at', startOfCurrentMonth)

    const paidSalesThisMonthPromise = supabase
        .from('orders')
        .select('id, total_amount, financial_transaction_id')
        .eq('org_id', profile.org_id)
        .eq('payment_status', 'paid')
        .gte('created_at', startOfCurrentMonth)

    const [
        currentMonthApptsRes,
        prevMonthApptsRes,
        transactionsRes,
        pendingSalesRes,
        allPendingApptsRes,
        paidPackagesThisMonthRes,
        paidSalesThisMonthRes
    ] = await Promise.all([
        currentMonthApptsPromise,
        prevMonthApptsPromise,
        transactionsPromise,
        pendingSalesPromise,
        allPendingApptsPromise,
        paidPackagesThisMonthPromise,
        paidSalesThisMonthPromise
    ]);

    if (currentMonthApptsRes.error) console.error("currentMonthApptsRes error:", currentMonthApptsRes.error);
    if (transactionsRes.error) console.error("transactionsRes error:", transactionsRes.error);
    if (paidSalesThisMonthRes.error) console.error("paidSalesThisMonthRes error:", paidSalesThisMonthRes.error);
    if (allPendingApptsRes.error) console.error("allPendingApptsRes error:", allPendingApptsRes.error);
    if (paidPackagesThisMonthRes.error) console.error("paidPackagesThisMonthRes error:", paidPackagesThisMonthRes.error);

    const currentMonthAppts = currentMonthApptsRes.data || [];
    const transactions = transactionsRes.data || [];
    const paidPackagesThisMonth = paidPackagesThisMonthRes.data || [];
    const paidSalesThisMonth = paidSalesThisMonthRes.data || [];

    const incomeTxs = (transactions || []).filter((t) => t.type === 'income')
    
    try {
        const idsToSkip = new Set([
            ...incomeTxs.map((t) => t.reference_id).filter(id => !!id),
            ...paidSalesThisMonth.filter((s) => !!s.financial_transaction_id).map((s) => s.id),
            ...currentMonthAppts.filter((a) => !!(a).financial_transaction_id).map((a) => a.id),
            ...paidPackagesThisMonth.filter((p) => !!(p).financial_transaction_id).map((p) => p.id)
        ])

        const totalRevenue = incomeTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0)
            + currentMonthAppts.filter((a) => 
                a.payment_status === 'paid' && 
                !idsToSkip.has(a.id) &&
                (Number(a.final_price) || Number(a.calculated_price) || 0) > 0
            ).reduce((sum, a) => sum + Number(a.final_price ?? a.calculated_price ?? 0), 0)
            + (paidPackagesThisMonth || [])
                .filter((p) => !idsToSkip.has(p.id))
                .reduce((sum, p) => sum + Number(p.total_paid || p.total_price || 0), 0)
            + (paidSalesThisMonth || [])
                .filter((s) => !idsToSkip.has(s.id))
                .reduce((sum, s) => sum + Number(s.total_amount || 0), 0)

        console.log("totalRevenue is:", totalRevenue, "pendingPayments is:", pendingPayments);
    } catch(e) {
        console.error("Exception thrown:", e.message);
    }
}
main();
const pendingSales = pendingSalesRes.data || [];
const allPendingAppts = allPendingApptsRes.data || [];
const pendingPayments = allPendingAppts.reduce((sum, a) => sum + Math.max(0, (a.final_price ?? a.calculated_price ?? 0)), 0) + pendingSales.reduce((sum, s) => sum + Math.max(0, (s.total_amount || 0)), 0);
console.log("pendingPayments is:", pendingPayments);
