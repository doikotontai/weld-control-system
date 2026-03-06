// app/(dashboard)/admin/page.tsx — Trang quản trị hệ thống
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
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

    return <AdminClient users={users || []} />
}
