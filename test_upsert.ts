import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function run() {
    const { data: vet, error: vetError } = await supabase
        .from('veterinarians')
        .upsert({
            org_id: 'd9b75128-4f24-4f51-b0e5-79a7863ccb64', // Dummy UUID
            user_id: 'd9b75128-4f24-4f51-b0e5-79a7863ccb64', // Dummy UUID
            name: 'Test',
            crmv: '1234',
            specialty: 'Test'
        }, { onConflict: 'user_id' })
    
    console.log("Error:", vetError)
}
run()
