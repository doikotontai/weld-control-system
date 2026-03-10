import Sidebar from '@/components/Sidebar'
import { requireDashboardAuth } from '@/lib/dashboard-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { supabase, cookieStore, role, fullName } = await requireDashboardAuth()
    const currentProjectId = cookieStore.get('weld-control-project-id')?.value || ''

    const { data: projects } = await supabase
        .from('projects')
        .select('id, code, name')
        .order('created_at', { ascending: false })

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar
                userRole={role}
                userName={fullName}
                projects={projects || []}
                currentProjectId={currentProjectId}
            />

            <main
                className="dashboard-layout-main"
                style={{
                    marginLeft: '240px',
                    flex: 1,
                    minWidth: 0,
                    maxWidth: 'calc(100vw - 240px)',
                    minHeight: '100vh',
                    background: '#f8fafc',
                    padding: '24px 32px',
                }}
            >
                {children}
            </main>
        </div>
    )
}
