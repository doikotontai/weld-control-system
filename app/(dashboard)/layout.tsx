// app/(dashboard)/layout.tsx
// Layout chung cho tất cả trang sau khi đăng nhập
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { UserRole } from '@/types'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    // Lấy thông tin user hiện tại
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Lấy profile (role, tên)
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

    const userRole = (profile?.role as UserRole) || 'viewer'
    const userName = profile?.full_name || user.email || 'User'

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <Sidebar userRole={userRole} userName={userName} />

            {/* Main content */}
            <main style={{
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
