const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '/Users/micheltsuboi/Documents/MY PET FLOW/.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
    const { data, error } = await supabase
        .from('pets')
        .select('id, name, customers(name, phone_1)')
        .limit(3);

    console.log('Error:', error);
    console.log('Data:', JSON.stringify(data, null, 2));
}

test();
