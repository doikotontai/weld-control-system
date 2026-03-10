import { requireDashboardAuth } from '@/lib/dashboard-auth'
import RequestForm from './RequestForm'

export const dynamic = 'force-dynamic'

export default async function NewRequestPage() {
    const { supabase, fullName, user } = await requireDashboardAuth(['admin', 'dcc', 'qc'])
    const { data: projects } = await supabase.from('projects').select('*')

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b', marginBottom: '24px' }}>
                Tạo yêu cầu kiểm tra mới
            </h1>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <RequestForm projects={projects || []} userName={fullName || user.email || ''} />
            </div>
        </div>
    )
}
