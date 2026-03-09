import { format } from 'date-fns'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RequestRow {
    id: string
    request_no: string
    request_type: string
    request_date: string | null
    requested_by: string | null
    status: string
    projects?: { code: string; name: string } | null
    profiles?: { full_name: string | null } | null
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
    fitup: { bg: '#dbeafe', color: '#1e40af' },
    backgouge: { bg: '#ffedd5', color: '#c2410c' },
    lamcheck: { bg: '#ecfdf5', color: '#065f46' },
    request: { bg: '#fef9c3', color: '#854d0e' },
    vs_final: { bg: '#ede9fe', color: '#6d28d9' },
}

const TYPE_LABELS: Record<string, string> = {
    fitup: 'Fit-Up',
    backgouge: 'Backgouge',
    lamcheck: 'Lamcheck',
    request: 'NDT / KhÃ¡ch hÃ ng visual',
    vs_final: 'VS Final',
}

function renderStatus(status: string) {
    if (status === 'completed') {
        return { label: 'HoÃ n thÃ nh', bg: '#dcfce7', color: '#166534' }
    }

    if (status === 'submitted') {
        return { label: 'ÄÃ£ gá»­i', bg: '#dbeafe', color: '#1e40af' }
    }

    return { label: 'Báº£n nhÃ¡p', bg: '#fef3c7', color: '#92400e' }
}

export default async function RequestsPage() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('weld-control-auth')?.value

    if (!accessToken) {
        redirect('/login')
    }

    const {
        data: { user },
    } = await supabase.auth.getUser(accessToken)

    if (!user) {
        redirect('/login')
    }

    const currentProjectId = cookieStore.get('weld-control-project-id')?.value || null

    let requests: RequestRow[] = []

    if (currentProjectId) {
        const { data } = await supabase
            .from('inspection_requests')
            .select(`
                *,
                projects ( code, name ),
                profiles ( full_name )
            `)
            .eq('project_id', currentProjectId)
            .order('created_at', { ascending: false })

        if (data) {
            requests = data as RequestRow[]
        }
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>YÃªu cáº§u kiá»ƒm tra</h1>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>
                        Danh sÃ¡ch request Ä‘Æ°á»£c táº¡o tá»« cÃ¡c nhÃ³m má»‘i hÃ n Ä‘Ã£ gÃ¡n sá»‘ request trong weld master.
                    </p>
                </div>
                <Link
                    href="/requests/new"
                    style={{
                        background: '#2563eb',
                        color: 'white',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <span>+</span>
                    <span>Táº¡o yÃªu cáº§u má»›i</span>
                </Link>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Dá»± Ã¡n</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Sá»‘ request</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Loáº¡i request</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>NgÃ y yÃªu cáº§u</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>NgÆ°á»i táº¡o</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Tráº¡ng thÃ¡i</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>HÃ nh Ä‘á»™ng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!currentProjectId ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                                        Vui lÃ²ng chá»n dá»± Ã¡n á»Ÿ menu bÃªn trÃ¡i Ä‘á»ƒ xem danh sÃ¡ch yÃªu cáº§u kiá»ƒm tra.
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>ðŸ“‹</div>
                                        <div style={{ fontWeight: 500 }}>ChÆ°a cÃ³ yÃªu cáº§u kiá»ƒm tra nÃ o trong dá»± Ã¡n nÃ y.</div>
                                        <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Báº¥m &quot;Táº¡o yÃªu cáº§u má»›i&quot; Ä‘á»ƒ báº¯t Ä‘áº§u.</div>
                                    </td>
                                </tr>
                            ) : (
                                requests.map((request) => {
                                    const typeColor = TYPE_COLORS[request.request_type] || { bg: '#f1f5f9', color: '#475569' }
                                    const typeLabel = TYPE_LABELS[request.request_type] || request.request_type
                                    const statusMeta = renderStatus(request.status)

                                    return (
                                        <tr key={request.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>
                                                {request.projects?.code || 'N/A'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                                                    {request.request_no}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ background: typeColor.bg, color: typeColor.color, padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                    {typeLabel}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: '#64748b' }}>
                                                {request.request_date ? format(new Date(request.request_date), 'dd/MM/yyyy') : 'â€”'}
                                            </td>
                                            <td style={{ padding: '12px 16px', color: '#64748b' }}>
                                                {request.profiles?.full_name || request.requested_by || 'â€”'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span
                                                    style={{
                                                        background: statusMeta.bg,
                                                        color: statusMeta.color,
                                                        padding: '4px 10px',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {statusMeta.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <Link
                                                    href={`/requests/${request.id}`}
                                                    style={{
                                                        display: 'inline-block',
                                                        padding: '6px 12px',
                                                        background: '#f1f5f9',
                                                        color: '#334155',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        textDecoration: 'none',
                                                    }}
                                                >
                                                    Xem chi tiáº¿t
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


