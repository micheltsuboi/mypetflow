-- Adicionar políticas de UPDATE e DELETE para orders e order_items
-- Pois estavam faltando e impedindo a exclusão via client standard

-- Orders
CREATE POLICY "Users can update orders in their org" ON public.orders
    FOR UPDATE USING (org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete orders in their org" ON public.orders
    FOR DELETE USING (org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
    ));

-- Order Items
CREATE POLICY "Users can update order_items in their org" ON public.order_items
    FOR UPDATE USING (order_id IN (
        SELECT id FROM public.orders WHERE org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete order_items in their org" ON public.order_items
    FOR DELETE USING (order_id IN (
        SELECT id FROM public.orders WHERE org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
        )
    ));
