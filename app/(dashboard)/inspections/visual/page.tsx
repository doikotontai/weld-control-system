import Link from 'next/link'
import { requireDashboardAuth } from '@/lib/dashboard-auth'

export const dynamic = 'force-dynamic'

interface VisualRow {
    id: string
    weld_id: string | null
    drawing_no: string | null
    weld_no: string | null
    joint_type: string | null
    weld_length: number | null
    visual_inspector: string | null
    visual_date: string | null
    inspection_request_no: string | null
    backgouge_date: string | null
    backgouge_request_no: string | null
    welders: string | null
    stage: string | null
}

function formatDate(value: unknown) {
    return value != null && value !== '' ? String(value).slice(0, 10) : '-'
}

function displayText(value: unknown) {
    return value != null && value !== '' ? String(value) : '-'
}

export default async function VisualPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const { supabase, cookieStore } = await requireDashboardAuth(['admin', 'dcc', 'qc', 'inspector'])
    const projectId = cookieStore.get('weld-control-project-id')?.value || null
    const searchParams = await props.searchParams
    const page = Number.parseInt(searchParams?.page || '0', 10)
    const limit = 100
    const offset = page * limit

    let welds: VisualRow[] = []
    let total = 0

    if (projectId) {
        const { data, count } = await supabase
            .from('welds')
            .select('id, weld_id, drawing_no, weld_no, joint_type, weld_length, visual_inspector, visual_date, inspection_request_no, backgouge_date, backgouge_request_no, welders, stage', { count: 'exact' })
            .eq('project_id', projectId)
            .not('visual_date', 'is', null)
            .order('excel_row_order', { ascending: true })
            .range(offset, offset + limit - 1)

        welds = (data || []) as VisualRow[]
        total = count || 0
    }

    const totalPages = Math.ceil(total / limit)
    const thStyle = { padding: '8px 12px', fontWeight: 600, color: '#475569', textAlign: 'left' as const, fontSize: '0.75rem', textTransform: 'uppercase' as const, background: '#f8fafc', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' as const }
    const tdStyle = { padding: '8px 12px', fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9', color: '#374151' }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Dữ liệu Visual</h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem' }}>
                    Dữ liệu visual hiện có trong weld master - {projectId ? `${total.toLocaleString()} mối hàn đã visual` : 'Chọn dự án để xem'}
                </p>
            </div>

            {!projectId ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>Vui lòng chọn dự án ở menu bên trái.</div>
            ) : (
                <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>#</th>
                                <th style={thStyle}>Weld ID</th>
                                <th style={thStyle}>Drawing No</th>
                                <th style={thStyle}>Weld No</th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Length</th>
                                <th style={thStyle}>Visual Inspector</th>
                                <th style={thStyle}>Visual Date</th>
                                <th style={thStyle}>NDT / KH Visual RQ</th>
                                <th style={thStyle}>BG Date</th>
                                <th style={thStyle}>BG Request</th>
                                <th style={thStyle}>Welders</th>
                                <th style={thStyle}>Stage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {welds.length === 0 ? (
                                <tr>
                                    <td colSpan={13} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        Chưa có mối hàn nào có dữ liệu visual.
                                    </td>
                                </tr>
                            ) : welds.map((weld, index) => (
                                <tr key={weld.id} style={{ background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                                    <td style={{ ...tdStyle, color: '#94a3b8' }}>{index + 1}</td>
                                    <td style={tdStyle}>
                                        <Link href={`/welds/${weld.id}`} style={{ color: '#7c3aed', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem', textDecoration: 'none' }}>
                                            {displayText(weld.weld_id)}
                                        </Link>
                                    </td>
                                    <td style={tdStyle}>{displayText(weld.drawing_no)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{displayText(weld.weld_no)}</td>
                                    <td style={tdStyle}>{displayText(weld.joint_type)}</td>
                                    <td style={tdStyle}>{weld.weld_length != null ? `${weld.weld_length}mm` : '-'}</td>
                                    <td style={tdStyle}>{displayText(weld.visual_inspector)}</td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(weld.visual_date)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: '#7c3aed' }}>{displayText(weld.inspection_request_no)}</td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(weld.backgouge_date)}</td>
                                    <td style={tdStyle}>{displayText(weld.backgouge_request_no)}</td>
                                    <td style={tdStyle}>{displayText(weld.welders)}</td>
                                    <td style={tdStyle}>
                                        <span style={{ padding: '2px 7px', borderRadius: '4px', background: '#f3e8ff', color: '#7c3aed', fontWeight: 600, fontSize: '0.7rem' }}>
                                            {displayText(weld.stage)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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


