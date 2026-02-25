'use server'

// src/app/actions/cashback.ts
// Server Actions for Cashback Loyalty

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Get cashback balance for a tutor (customer).
 */
export async function getCashbackBalance(tutorId: string) {
    const supabase = await createClient();

    // Calcular saldo apenas de transações não expiradas
    const { data, error } = await supabase
        .from('cashback_transactions')
        .select('amount')
        .eq('tutor_id', tutorId)
        .gt('expires_at', new Date().toISOString())
        .gt('amount', 0);

    if (error) {
        console.error('Error fetching cashback balance:', error);
        return { success: false, balance: 0, error: error.message };
    }

    const balance = data.reduce((acc, curr) => acc + Number(curr.amount), 0);

    // Sincronizar cache de balance (opcional, mas bom para performance em outras telas)
    await supabase.from('cashbacks').update({ balance }).eq('tutor_id', tutorId);

    return { success: true, balance };
}

/**
 * Add cashback to a tutor based on an order.
 * Called after a successful checkout when the user chooses to accumulate cashback.
 */
export async function addCashbackFromOrder(orderId: string) {
    const supabase = await createClient();
    // Fetch order and its items
    const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('id, tutor_id, total_amount, org_id')
        .eq('id', orderId)
        .single();
    if (orderErr) throw orderErr;

    // Get applicable rules for the tutor's organization
    const { data: rules, error: rulesErr } = await supabase
        .from('cashback_rules')
        .select('type, target_id, percent')
        .eq('org_id', order.org_id)
        .gt('valid_until', new Date().toISOString())
        .or('type.eq.product,type.eq.category');
    if (rulesErr) throw rulesErr;

    // Calculate total cashback based on rules (simplified: apply percent on total amount)
    let totalPercent = 0;
    for (const rule of rules) {
        totalPercent += Number(rule.percent);
    }
    const cashbackAmount = (order.total_amount * totalPercent) / 100;

    if (cashbackAmount <= 0) return { success: true, added: 0 };

    // Upsert cashback record
    const { data: existing, error: existingErr } = await supabase
        .from('cashbacks')
        .select('id, balance')
        .eq('tutor_id', order.tutor_id)
        .single();

    if (existingErr && existingErr.code !== 'PGRST116') {
        // If not a not-found error, rethrow
        throw existingErr;
    }

    if (existing) {
        const { error: updErr } = await supabase
            .from('cashbacks')
            .update({
                balance: Number(existing.balance) + cashbackAmount,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        if (updErr) throw updErr;
    } else {
        const { error: insErr } = await supabase
            .from('cashbacks')
            .insert({
                tutor_id: order.tutor_id,
                balance: cashbackAmount,
                updated_at: new Date().toISOString()
            });
        if (insErr) throw insErr;
    }

    revalidatePath('/owner/tutors');
    return { success: true, added: cashbackAmount };
}

/**
 * Apply cashback to an order, reducing the total amount.
 */
export async function applyCashbackToOrder(orderId: string, amount: number) {
    const supabase = await createClient();
    // Fetch order
    const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('id, total_amount, tutor_id')
        .eq('id', orderId)
        .single();
    if (orderErr) throw orderErr;

    // Verify tutor has enough balance
    const { data: cb, error: cbErr } = await supabase
        .from('cashbacks')
        .select('id, balance')
        .eq('tutor_id', order.tutor_id)
        .single();
    if (cbErr) throw cbErr;
    if (Number(cb.balance) < amount) {
        throw new Error('Saldo de cashback insuficiente');
    }

    // Update order total
    const newTotal = Number(order.total_amount) - amount;
    const { error: updOrderErr } = await supabase
        .from('orders')
        .update({ total_amount: newTotal })
        .eq('id', orderId);
    if (updOrderErr) throw updOrderErr;

    // Deduct from cashback balance
    const { error: updCbErr } = await supabase
        .from('cashbacks')
        .update({ balance: Number(cb.balance) - amount })
        .eq('id', cb.id);
    if (updCbErr) throw updCbErr;

    revalidatePath('/owner/tutors');
    revalidatePath('/owner/petshop');
    return { success: true, newTotal };
}

/**
 * CRUD for cashback rules (owner side).
 */
export async function createCashbackRule(rule: {
    org_id: string;
    type: 'product' | 'category';
    target_id: string;
    percent: number;
    validity_months: number;
    created_by: string;
}) {
    const supabase = await createClient();
    const { data, error } = await supabase.from('cashback_rules').insert({
        ...rule,
        created_at: new Date().toISOString()
    }).select().single();
    if (error) throw error;
    revalidatePath('/owner/cashback');
    return data;
}

export async function getCashbackRules(orgId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cashback_rules')
        .select('*')
        .eq('org_id', orgId);
    if (error) throw error;
    return data;
}

export async function deleteCashbackRule(ruleId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('cashback_rules').delete().eq('id', ruleId);
    if (error) throw error;
    revalidatePath('/owner/cashback');
    return { success: true };
}
