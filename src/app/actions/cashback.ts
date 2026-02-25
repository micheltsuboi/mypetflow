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
    // Sincronizar cache de balance (opcional, mas bom para performance em outras telas)
    // Nota: O update pode falhar se o registro de cache ainda não existir ou RLS bloquear.
    try {
        await supabase.from('cashbacks').update({ balance }).eq('tutor_id', tutorId);
    } catch (e) {
        console.warn('Could not sync cashback cache:', e);
    }

    return { success: true, balance };
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
    const { data, error } = await supabase
        .from('cashback_rules')
        .insert(rule)
        .select()
        .single();
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

export async function getCashbackHistory(orgId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cashback_history')
        .select(`
            *,
            customers!cashback_history_tutor_id_fkey(name)
        `)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

