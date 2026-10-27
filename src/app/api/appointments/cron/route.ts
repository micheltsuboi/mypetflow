import { NextRequest, NextResponse } from 'next/server'
import { sendAppointmentRemindersTomorrow } from '@/app/actions/appointment'

/**
 * Endpoint para disparar lembretes de agendamento de amanhã (24h de antecedência).
 * Funciona de forma 100% autônoma via Z-API sem depender de N8N.
 * 
 * Exemplo de chamada:
 * POST /api/appointments/cron
 * Headers: Authorization: Bearer <CRON_SECRET>
 * Body (opcional): { "org_id": "...", "date": "YYYY-MM-DD" }
 */
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || process.env.N8N_WEBHOOK_SECRET
    
    // Validação opcional de segredo caso configurado nas variáveis de ambiente
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const orgId = body.org_id
        const targetDate = body.date || body.target_date

        const result = await sendAppointmentRemindersTomorrow(orgId, targetDate)
        return NextResponse.json(result)
    } catch (error: any) {
        console.error('[API appointments/cron] Erro:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET || process.env.N8N_WEBHOOK_SECRET
    const secretQuery = req.nextUrl.searchParams.get('secret')
    const authHeader = req.headers.get('authorization')

    if (cronSecret && secretQuery !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const orgId = req.nextUrl.searchParams.get('org_id') || undefined
        const targetDate = req.nextUrl.searchParams.get('date') || undefined

        const result = await sendAppointmentRemindersTomorrow(orgId, targetDate)
        return NextResponse.json(result)
    } catch (error: any) {
        console.error('[API appointments/cron GET] Erro:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
