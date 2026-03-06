import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import RequestForm from './RequestForm'

export const dynamic = 'force-dynamic'

export default async function NewRequestPage() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('weld-control-auth')?.value

    if (!accessToken) redirect('/login')

    const { data: { user } } = await supabase.auth.getUser(accessToken)
    if (!user) redirect('/login')

    // Fetch user profile to check roles
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

    if (!profile || !['admin', 'dcc', 'qc'].includes(profile.role)) {
        redirect('/requests')
    }

    // Lấy danh sách dự án
    const { data: projects } = await supabase.from('projects').select('*').eq('is_active', true)

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b', marginBottom: '24px' }}>
                Tạo Yêu cầu Kiểm tra mới (New Request)
            </h1>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <RequestForm projects={projects || []} userName={profile?.full_name || user.email} />
            </div>
        </div>
    )
}
