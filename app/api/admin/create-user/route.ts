// app/api/admin/create-user/route.ts
// API route để tạo user mới (chỉ admin)
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
    try {
        // Check if current user is admin
        const supabase = await createClient()

        const cookieStore = await cookies()
        const accessToken = cookieStore.get('weld-control-auth')?.value
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: { user } } = await supabase.auth.getUser(accessToken)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role !== 'admin') return NextResponse.json({ error: 'Cần quyền Admin' }, { status: 403 })

        // Use service role client to create user
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { email, password, full_name, role } = await req.json()

        // Create auth user
        const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, role }
        })

        if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

        // Update profile role (trigger already created it)
        await adminSupabase.from('profiles').update({ role, full_name }).eq('id', newUser.user.id)

        return NextResponse.json({
            user: {
                id: newUser.user.id,
                email,
                full_name,
                role,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }
        })
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 })
    }
}
