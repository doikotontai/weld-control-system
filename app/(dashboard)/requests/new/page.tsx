import { requireDashboardAuth } from '@/lib/dashboard-auth'
import RequestForm from './RequestForm'

export const dynamic = 'force-dynamic'

export default async function NewRequestPage() {
    const { supabase, fullName, user } = await requireDashboardAuth(['admin', 'dcc', 'qc'])
    const { data: projects } = await supabase.from('projects').select('id, code, name').order('created_at', { ascending: false })

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b', marginBottom: '24px' }}>
                Tạo yêu cầu kiểm tra mới
            </h1>
            <RequestForm projects={projects || []} userName={fullName || user.email || ''} />
        </div>
    )
}
