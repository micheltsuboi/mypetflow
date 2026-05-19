const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkColumns() {
    // We can fetch one row to see what keys it returns
    const { data, error } = await supabase
        .from('pets')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error fetching pet row:', error)
    } else {
        console.log('Sample row columns:', Object.keys(data[0] || {}))
    }
}

checkColumns()
