import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const N8N_BASE_URL = process.env.N8N_BASE_URL!
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
    // 1. Validate the internal secret so only Supabase triggers can call this
    const secret = req.headers.get('x-webhook-secret')
    if (secret !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, record, old_record } = body

    // We only care about appointment events
    if (!record?.id) {
        return NextResponse.json({ ok: true })
    }

    const appointmentId: string = record.id
    const newStatus: string = record.status
    const oldStatus: string | null = old_record?.status ?? null

    // 2. Enrich the payload — fetch pet name, service name, and tutor phone
    const { data: appointment } = await supabaseAdmin
        .from('appointments')
        .select(`
            id,
            scheduled_at,
            status,
            pets ( name ),
            services ( name ),
            customers ( name, phone_1, phone_2, user_id )
        `)
        .eq('id', appointmentId)
        .single()

    if (!appointment) {
        return NextResponse.json({ ok: true, skipped: 'appointment not found' })
    }

    const petName = (appointment.pets as any)?.name ?? 'seu pet'
    const serviceName = (appointment.services as any)?.name ?? 'serviço'
    const customer = appointment.customers as any
    const tutorPhone = customer?.phone_1 || customer?.phone_2 || null
    const scheduledAt = appointment.scheduled_at

    const formattedDate = scheduledAt
        ? new Date(scheduledAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        : ''
    const formattedTime = scheduledAt
        ? new Date(scheduledAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
        })
        : ''

    const enrichedPayload = {
        appointmentId,
        newStatus,
        oldStatus,
        petName,
        serviceName,
        tutorPhone,
        formattedDate,
        formattedTime,
        eventType: type, // INSERT | UPDATE | DELETE
    }

    // 3. Decide which N8N webhook to call based on the event
    let webhookPath: string | null = null

    if (type === 'INSERT' && (newStatus === 'pending' || newStatus === 'confirmed')) {
        webhookPath = '/webhook/pet-agendamento'
    } else if (type === 'UPDATE') {
        const isStatusChange = newStatus !== oldStatus

        if (isStatusChange && newStatus === 'in_progress') {
            webhookPath = '/webhook-test/pet-status'
        } else if (isStatusChange && newStatus === 'done') {
            webhookPath = '/webhook-test/pet-status'
        }
    }

    if (webhookPath) {
        console.log(`[N8N Trigger TEST MODE] Event detected: ${type} status ${oldStatus} -> ${newStatus}. Calling ${webhookPath}`)
    }

    if (!webhookPath || !tutorPhone) {
        // No relevant event or no phone to send to
        return NextResponse.json({ ok: true, skipped: 'no relevant event or missing phone' })
    }

    // 4. Forward to N8N
    try {
        const n8nUrlObj = new URL(`${N8N_BASE_URL}${webhookPath}`)
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        }

        // If the N8N URL contains Basic Auth credentials, we MUST manually inject them into headers
        if (n8nUrlObj.username && n8nUrlObj.password) {
            const encodedAuth = Buffer.from(`${n8nUrlObj.username}:${n8nUrlObj.password}`).toString('base64')
            headers['Authorization'] = `Basic ${encodedAuth}`
            // clean url without credentials for fetch 
            n8nUrlObj.username = ''
            n8nUrlObj.password = ''
        }

        console.log(`[N8N Trigger] Calling ${webhookPath} at ${n8nUrlObj.origin}...`)
        console.log('[N8N Trigger] Sending payload:', JSON.stringify(enrichedPayload, null, 2))

        const n8nResponse = await fetch(n8nUrlObj.toString(), {
            method: 'POST',
            headers,
            body: JSON.stringify(enrichedPayload),
        })

        const n8nText = await n8nResponse.text()
        console.log(`[N8N Trigger] Called ${webhookPath} → ${n8nResponse.status}: ${n8nText}`)

        return NextResponse.json({ ok: true, n8nStatus: n8nResponse.status, n8nText })
    } catch (error) {
        console.error('[N8N Trigger] Error calling N8N:', error)
        return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
    }
}
