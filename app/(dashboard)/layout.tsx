// app/(dashboard)/layout.tsx
// Layout chung cho tất cả trang sau khi đăng nhập
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { UserRole } from '@/types'

import { cookies } from 'next/headers'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    // Đọc token trực tiếp từ cookie
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('weld-control-auth')?.value

    if (!accessToken) {
        redirect('/login')
    }

    // Lấy thông tin user hiện tại bằng token
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)

    if (userError || !user) {
        redirect('/login')
    }

    // Lấy profile (role, tên)
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

    const userRole = (profile?.role as UserRole) || 'viewer'
    const userName = profile?.full_name || user.email || 'User'

    // Đọc projectId đang được select từ cookie
    const currentProjectId = cookieStore.get('weld-control-project-id')?.value || ''

    // Lấy danh sách dự án cho Dropdown Filter
    const { data: projects } = await supabase
        .from('projects')
        .select('id, code, name')
        .order('created_at', { ascending: false })

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <Sidebar
                userRole={userRole}
                userName={userName}
                projects={projects || []}
                currentProjectId={currentProjectId}
            />

            {/* Main content */}
            <main className="dashboard-layout-main" style={{
                marginLeft: '240px',
                flex: 1,
                minHeight: '100vh',
                background: '#f1f5f9',
                padding: '24px',
            }}>
                {children}
            </main>
        </div>
    )
}
