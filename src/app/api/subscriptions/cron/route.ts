import { NextRequest, NextResponse } from 'next/server'
import { sendSubscriptionDueDateReminders, renewSubscriptionsForOrg } from '@/app/actions/subscription'
import { createAdminClient } from '@/lib/supabase/admin'

// This endpoint is called by N8N on:
// - Day 8 of each month for due date reminders (action=reminder)
// - Day 1 of each month for monthly session renewal (action=renew)
//
// N8N Webhook path: /api/subscriptions/cron
// Authorization header: Bearer <CRON_SECRET>

export async function POST(req: NextRequest) {
    // Validate authorization
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || process.env.N8N_WEBHOOK_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const action = body.action || 'reminder' // 'reminder' | 'renew'
        const orgId = body.org_id // optional: run for specific org only

        if (action === 'reminder') {
            const result = await sendSubscriptionDueDateReminders(orgId)
            return NextResponse.json({ success: true, ...result })
        }

        if (action === 'renew') {
            if (orgId) {
                const result = await renewSubscriptionsForOrg(orgId)
                return NextResponse.json({ success: true, ...result })
            }

            // Run for ALL orgs that have active subscriptions
            const adminSupabase = await createAdminClient()
            const { data: orgs } = await adminSupabase
                .from('customer_packages')
                .select('org_id')
                .eq('is_subscription', true)
                .eq('is_active', true)
                .eq('paused', false)

            const uniqueOrgIds = [...new Set((orgs || []).map(o => o.org_id))]

            let totalRenewed = 0
            for (const id of uniqueOrgIds) {
                const result = await renewSubscriptionsForOrg(id)
                totalRenewed += (result as any).count || 0
            }

            return NextResponse.json({ success: true, count: totalRenewed, message: `Total de ${totalRenewed} mensalidades renovadas em ${uniqueOrgIds.length} organizações.` })
        }

        return NextResponse.json({ error: 'Ação inválida. Use "reminder" ou "renew".' }, { status: 400 })
    } catch (error: any) {
        console.error('[Subscriptions Cron]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    return NextResponse.json({ message: 'Use POST to trigger subscription cron jobs.' })
}
