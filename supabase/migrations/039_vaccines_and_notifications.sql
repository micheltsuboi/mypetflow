-- Create pet_vaccines table
CREATE TABLE IF NOT EXISTS public.pet_vaccines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    batch_number TEXT,
    application_date DATE,
    expiry_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TYPE notification_type AS ENUM ('vaccine_expiry', 'product_expiry');

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notification_reads table
CREATE TABLE IF NOT EXISTS public.notification_reads (
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (notification_id, user_id)
);

-- Add RLS Policies

-- pet_vaccines
ALTER TABLE public.pet_vaccines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vaccines for their org's pets" ON public.pet_vaccines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE pets.id = pet_vaccines.pet_id
            AND pets.customer_id IN (
                SELECT id FROM public.customers WHERE org_id IN (
                    SELECT org_id FROM public.profiles WHERE id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Tutors can view their own pets' vaccines" ON public.pet_vaccines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE pets.id = pet_vaccines.pet_id
            AND pets.customer_id IN (
                SELECT id FROM public.customers WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Staff/Admins can manage vaccines" ON public.pet_vaccines
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('staff', 'admin', 'superadmin')
        )
    );

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notifications for their org" ON public.notifications
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "System/Staff can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- notification_reads
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reads" ON public.notification_reads
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reads" ON public.notification_reads
    FOR INSERT WITH CHECK (user_id = auth.uid());
