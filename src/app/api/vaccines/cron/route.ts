import { NextRequest, NextResponse } from 'next/server'
import { sendVaccineReminders } from '@/app/actions/vaccine'

/**
 * Endpoint de Cron para disparar lembretes de vacinas a vencer.
 * Dispara tanto para vacinas que vencem em 7 dias quanto para vacinas que vencem hoje.
 * 100% autônomo via Z-API sem dependência de N8N.
 *
 * Chamada:
 * GET /api/vaccines/cron
 * Headers: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET || process.env.N8N_WEBHOOK_SECRET
    const secretQuery = req.nextUrl.searchParams.get('secret')
    const authHeader = req.headers.get('authorization')

    if (cronSecret && secretQuery !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const orgId = req.nextUrl.searchParams.get('org_id') || undefined

        // Dispara com 7 dias de antecedência
        const res7Days = await sendVaccineReminders(orgId, 7)
        // Dispara para o próprio dia de vencimento (hoje)
        const resToday = await sendVaccineReminders(orgId, 0)

        const totalSent = (res7Days.count || 0) + (resToday.count || 0)

        return NextResponse.json({
            success: true,
            totalSent,
            in7Days: res7Days,
            today: resToday,
            message: `${totalSent} lembrete(s) de vacina processado(s) com sucesso.`
        })
    } catch (error: any) {
        console.error('[API vaccines/cron GET] Erro:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET || process.env.N8N_WEBHOOK_SECRET
    const authHeader = req.headers.get('authorization')

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const orgId = body.org_id
        const daysAhead = typeof body.days_ahead === 'number' ? body.days_ahead : 7

        const res = await sendVaccineReminders(orgId, daysAhead)
        return NextResponse.json(res)
    } catch (error: any) {
        console.error('[API vaccines/cron POST] Erro:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
