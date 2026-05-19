const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testSearch() {
    const term = '123'
    const orgId = '75d1d440-62be-4835-ab35-3bbf84762c9c' // standard org id or any
    
    // 1. Search tutors matching the term
    const { data: matchedCustomers, error: custError } = await supabase
        .from('customers')
        .select('id')
        .eq('org_id', orgId)
        .or(`name.ilike.%${term}%,physical_file_number.ilike.%${term}%`)
    
    if (custError) {
        console.error('Tutor search error:', custError)
        return
    }
    
    const customerIds = (matchedCustomers || []).map(c => c.id)
    console.log('Matched customer IDs:', customerIds)
    
    let query = supabase.from('pets').select(`
        id, name, breed,
        customers!inner ( id, name, physical_file_number )
    `).eq('customers.org_id', orgId).order('name')
    
    if (customerIds.length > 0) {
        query = query.or(`name.ilike.%${term}%,breed.ilike.%${term}%,customer_id.in.(${customerIds.map(id => `"${id}"`).join(',')})`)
    } else {
        query = query.or(`name.ilike.%${term}%,breed.ilike.%${term}%`)
    }
    
    const { data, error } = await query
    if (error) {
        console.error('Pets query error:', error)
    } else {
        console.log('Search success! Results:', data)
    }
}

testSearch()
