const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testSearch() {
    const term = '123'
    const { data, error } = await supabase
        .from('pets')
        .select(`
            id, name, breed,
            customers!inner ( id, name, physical_file_number )
        `)
        .or(`name.ilike.%${term}%,breed.ilike.%${term}%,customers.physical_file_number.ilike.%${term}%,customers.name.ilike.%${term}%`)
        .limit(5)

    if (error) {
        console.error('Error searching:', error)
    } else {
        console.log('Search successful! Results:', data)
    }
}

testSearch()
