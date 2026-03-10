import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types'

type DashboardAuthContext = {
    supabase: Awaited<ReturnType<typeof createClient>>
    cookieStore: Awaited<ReturnType<typeof cookies>>
    user: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>['auth']['getUser']>>['data']['user']>
    role: UserRole
    fullName: string
}

export async function requireDashboardAuth(allowedRoles?: UserRole[]): Promise<DashboardAuthContext> {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('weld-control-auth')?.value

    if (!accessToken) {
        redirect('/login')
    }

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser(accessToken)

    if (userError || !user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

    const role = (profile?.role as UserRole) || 'viewer'

    if (allowedRoles && !allowedRoles.includes(role)) {
        redirect('/dashboard')
    }

    return {
        supabase,
        cookieStore,
        user,
        role,
        fullName: profile?.full_name || user.email || 'User',
    }
}
