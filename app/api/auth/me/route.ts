import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types'

export async function GET() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('weld-control-auth')?.value

    if (!accessToken) {
        return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
        return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, is_active')
        .eq('id', user.id)
        .single()

    return NextResponse.json({
        authenticated: true,
        user: {
            id: user.id,
            email: user.email,
            full_name: profile?.full_name || user.email || 'User',
            role: ((profile?.role as UserRole) || 'viewer'),
            is_active: profile?.is_active ?? true,
        },
    })
}
