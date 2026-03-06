import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { format } from 'date-fns'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function RequestsPage() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('weld-control-auth')?.value

    if (!accessToken) redirect('/login')

    const { data: { user } } = await supabase.auth.getUser(accessToken)
    if (!user) redirect('/login')

    const currentProjectId = cookieStore.get('weld-control-project-id')?.value || null

    let requests: any[] = []

    if (currentProjectId) {
        // Fetch requests joined with projects
        const { data, error } = await supabase
            .from('inspection_requests')
            .select(`
                *,
                projects ( code, name ),
                profiles ( full_name )
            `)
            .eq('project_id', currentProjectId)
            .order('created_at', { ascending: false })

        if (data) requests = data
    }

    // If tables are empty or error occurs
    const safeRequests = requests || []

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>Yêu cầu Kiểm tra (Inspection Requests)</h1>
                <Link
                    href="/requests/new"
                    style={{
                        background: '#3b82f6', color: 'white', padding: '10px 16px',
                        borderRadius: '6px', textDecoration: 'none', fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: '8px',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                >
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tạo Yêu cầu mới
                </Link>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Dự án</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Số Request</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Loại kiểm tra</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Ngày Yêu cầu</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Người tạo</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Trạng thái</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!currentProjectId ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                                        Vui lòng chọn Dự án ở thẻ menu trái để xem Yêu cầu kiểm tra.
                                    </td>
                                </tr>
                            ) : safeRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
                                        <div style={{ fontWeight: 500 }}>Chưa có Yêu cầu kiểm tra nào trong Dự án này.</div>
                                        <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Bấm &quot;Tạo Yêu cầu mới&quot; để bắt đầu.</div>
                                    </td>
                                </tr>
                            ) : (
                                safeRequests.map((req: any) => {
                                    const typeColors: Record<string, { bg: string; color: string }> = {
                                        fitup: { bg: '#dbeafe', color: '#1e40af' },
                                        backgouge: { bg: '#ffedd5', color: '#c2410c' },
                                        lamcheck: { bg: '#ecfdf5', color: '#065f46' },
                                        mpi: { bg: '#fef9c3', color: '#854d0e' },
                                    }
                                    const tc = typeColors[req.request_type] || { bg: '#f1f5f9', color: '#475569' }
                                    const typeLabel: Record<string, string> = {
                                        fitup: 'Fit-Up', backgouge: 'Backgouge',
                                        lamcheck: 'Lamcheck', mpi: 'MPI/MT/UT',
                                    }
                                    return (
                                        <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>
                                                {req.projects?.code || 'N/A'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                                                    {req.request_no}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ background: tc.bg, color: tc.color, padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                    {typeLabel[req.request_type] || req.request_type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: '#64748b' }}>
                                                {req.request_date ? format(new Date(req.request_date), 'dd/MM/yyyy') : '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', color: '#64748b' }}>
                                                {req.profiles?.full_name || req.requested_by || '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    background: req.status === 'completed' ? '#dcfce7' : req.status === 'submitted' ? '#dbeafe' : '#fef3c7',
                                                    color: req.status === 'completed' ? '#166534' : req.status === 'submitted' ? '#1e40af' : '#92400e',
                                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600
                                                }}>
                                                    {req.status === 'completed' ? '✅ Hoàn thành' : req.status === 'submitted' ? '📤 Đã gửi' : '📝 Bản nháp'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <Link href={`/requests/${req.id}`} style={{
                                                    display: 'inline-block', padding: '6px 12px', background: '#f1f5f9', color: '#334155', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none'
                                                }}>
                                                    👁️ Xem
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
