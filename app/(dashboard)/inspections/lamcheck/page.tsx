import Link from 'next/link'
import { requireDashboardAuth } from '@/lib/dashboard-auth'
import SyncedTableFrame from '@/components/SyncedTableFrame'

export const dynamic = 'force-dynamic'

interface LamcheckRow {
    id: string
    weld_id: string | null
    drawing_no: string | null
    weld_no: string | null
    joint_type: string | null
    thickness_lamcheck: number | null
    goc_code: string | null
    lamcheck_date: string | null
    lamcheck_request_no: string | null
    lamcheck_report_no: string | null
    welders: string | null
    stage: string | null
}

function formatDate(value: unknown) {
    return value != null && value !== '' ? String(value).slice(0, 10) : '-'
}

function displayText(value: unknown) {
    return value != null && value !== '' ? String(value) : '-'
}

export default async function LamcheckPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const { supabase, cookieStore } = await requireDashboardAuth(['admin', 'dcc', 'qc', 'inspector'])
    const projectId = cookieStore.get('weld-control-project-id')?.value || null
    const searchParams = await props.searchParams
    const page = Number.parseInt(searchParams?.page || '0', 10)
    const limit = 100
    const offset = page * limit

    let welds: LamcheckRow[] = []
    let total = 0

    if (projectId) {
        const { data, count } = await supabase
            .from('welds')
            .select('id, weld_id, drawing_no, weld_no, joint_type, thickness_lamcheck, goc_code, lamcheck_date, lamcheck_request_no, lamcheck_report_no, welders, stage', { count: 'exact' })
            .eq('project_id', projectId)
            .not('lamcheck_date', 'is', null)
            .order('excel_row_order', { ascending: true })
            .range(offset, offset + limit - 1)

        welds = (data || []) as LamcheckRow[]
        total = count || 0
    }

    const totalPages = Math.ceil(total / limit)
    const thStyle = { padding: '8px 12px', fontWeight: 600, color: '#475569', textAlign: 'left' as const, fontSize: '0.75rem', textTransform: 'uppercase' as const, background: '#f8fafc', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' as const }
    const tdStyle = { padding: '8px 12px', fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9', color: '#374151' }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Lamcheck</h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem' }}>
                    Tương ứng sheet <strong>LAMCHECK</strong> - {projectId ? `${total.toLocaleString()} mối hàn đã Lamcheck` : 'Chọn dự án để xem'}
                </p>
            </div>

            {!projectId ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>Vui lòng chọn dự án ở menu bên trái.</div>
            ) : (
                <SyncedTableFrame>
                    <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>#</th>
                                <th style={thStyle}>Weld ID</th>
                                <th style={thStyle}>Drawing No</th>
                                <th style={thStyle}>Weld No</th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Thick LC</th>
                                <th style={thStyle}>GOC Code</th>
                                <th style={thStyle}>LC Date</th>
                                <th style={thStyle}>LC Request</th>
                                <th style={thStyle}>LC Report</th>
                                <th style={thStyle}>Welders</th>
                                <th style={thStyle}>Stage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {welds.length === 0 ? (
                                <tr>
                                    <td colSpan={12} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        Chưa có mối hàn nào có dữ liệu Lamcheck.
                                    </td>
                                </tr>
                            ) : welds.map((weld, index) => (
                                <tr key={weld.id} style={{ background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                                    <td style={{ ...tdStyle, color: '#94a3b8' }}>{index + 1}</td>
                                    <td style={tdStyle}>
                                        <Link href={`/welds/${weld.id}`} style={{ color: '#065f46', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem', textDecoration: 'none' }}>
                                            {displayText(weld.weld_id)}
                                        </Link>
                                    </td>
                                    <td style={tdStyle}>{displayText(weld.drawing_no)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{displayText(weld.weld_no)}</td>
                                    <td style={tdStyle}>{displayText(weld.joint_type)}</td>
                                    <td style={tdStyle}>{displayText(weld.thickness_lamcheck)}</td>
                                    <td style={tdStyle}>{displayText(weld.goc_code)}</td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(weld.lamcheck_date)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: '#065f46' }}>{displayText(weld.lamcheck_request_no)}</td>
                                    <td style={tdStyle}>{displayText(weld.lamcheck_report_no)}</td>
                                    <td style={tdStyle}>{displayText(weld.welders)}</td>
                                    <td style={tdStyle}>
                                        <span style={{ padding: '2px 7px', borderRadius: '4px', background: '#ecfdf5', color: '#065f46', fontWeight: 600, fontSize: '0.7rem' }}>
                                            {displayText(weld.stage)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </SyncedTableFrame>
            )}

            {totalPages > 1 && (
                <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Trang {page + 1}/{totalPages} - Khớp {total} mối hàn
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {page > 0 && <Link href={`?page=${page - 1}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>Trước</Link>}
                        {page < totalPages - 1 && <Link href={`?page=${page + 1}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>Sau</Link>}
                    </div>
                </div>
            )}
        </div>
    )
}
