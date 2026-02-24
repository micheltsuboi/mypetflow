
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim()
    }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupMasterAdmin() {
    const email = 'contato@mypetflow.com.br'
    const password = '@Mypet135'

    console.log(`Setting up Master Admin: ${email}`)

    // 1. Check if user exists
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
        console.error('Error listing users:', listError)
        return
    }

    let user = users.users.find(u => u.email === email)

    if (user) {
        console.log('User already exists, updating password...')
        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            password: password,
            email_confirm: true
        })
        if (updateError) {
            console.error('Error updating user:', updateError)
            return
        }
        user = updatedUser.user
    } else {
        console.log('User does not exist, creating...')
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Master Admin' }
        })
        if (createError) {
            console.error('Error creating user:', createError)
            return
        }
        user = newUser.user
    }

    if (!user) {
        console.error('No user found or created.')
        return
    }

    // 2. Ensure Profile exists and has superadmin role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    if (profileError) {
        console.error('Error fetching profile:', profileError)
        return
    }

    if (profile) {
        console.log('Updating profile role to superadmin...')
        const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({ role: 'superadmin' })
            .eq('id', user.id)

        if (updateProfileError) {
            console.error('Error updating profile:', updateProfileError)
        } else {
            console.log('Profile updated successfully.')
        }
    } else {
        console.log('Profile not found, waiting for trigger or creating manually...')
        // Usually, a trigger creates the profile. If not, we create it.
        const { error: insertProfileError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                email: email,
                full_name: 'Master Admin',
                role: 'superadmin'
            })

        if (insertProfileError) {
            console.error('Error inserting profile:', insertProfileError)
        } else {
            console.log('Profile created successfully.')
        }
    }

    console.log('Master Admin setup complete!')
}

setupMasterAdmin()
