import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: customer } = await supabaseAdmin.from('customers').select('*').not('user_id', 'is', null).limit(1).single()
    if (!customer) return NextResponse.json({ error: 'No customer' })

    const { data: pet } = await supabaseAdmin.from('pets').select('*').eq('customer_id', customer.id).limit(1).single()
    const { data: service } = await supabaseAdmin.from('services').select('*').eq('org_id', customer.org_id).limit(1).single()

    const { data, error } = await supabaseAdmin.from('appointments').insert({
        org_id: customer.org_id,
        pet_id: pet?.id,
        service_id: service?.id,
        customer_id: customer.id,
        scheduled_at: new Date().toISOString(),
        status: 'pending',
        calculated_price: null,
        notes: 'Debug API',
        payment_status: 'pending'
    }).select()

    if (data && data.length) await supabaseAdmin.from('appointments').delete().eq('id', data[0].id)

    return NextResponse.json({ customer_id: customer.id, error, data })
}
