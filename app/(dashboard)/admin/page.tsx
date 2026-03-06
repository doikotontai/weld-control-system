// app/(dashboard)/admin/page.tsx — Trang quản trị hệ thống
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'
import ProjectManagement from './ProjectManagement'

import { cookies } from 'next/headers'

export default async function AdminPage() {
    const supabase = await createClient()

    const cookieStore = await cookies()
    const accessToken = cookieStore.get('weld-control-auth')?.value
    if (!accessToken) redirect('/login')

    const { data: { user } } = await supabase.auth.getUser(accessToken)
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    // Chỉ admin mới được vào trang này
    if (profile?.role !== 'admin') {
        redirect('/dashboard')
    }

    // Lấy danh sách users
    const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    // Lấy danh sách projects
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', paddingBottom: '48px' }}>
            <AdminClient users={users || []} />
            <ProjectManagement initialProjects={projects || []} />
        </div>
    )
}
