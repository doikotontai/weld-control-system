import { requireDashboardAuth } from '@/lib/dashboard-auth'
import AdminClient from './AdminClient'
import ProjectManagement from './ProjectManagement'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminPage() {
    const { supabase } = await requireDashboardAuth(['admin'])

    const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

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
