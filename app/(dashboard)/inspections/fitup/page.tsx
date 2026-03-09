import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface FitUpRow {
    id: string
    weld_id: string | null
    drawing_no: string | null
    goc_code: string | null
    fitup_inspector: string | null
    fitup_date: string | null
    fitup_request_no: string | null
    weld_finish_date: string | null
    welders: string | null
    weld_no: string | null
    joint_type: string | null
    weld_length: number | null
    stage: string | null
}

function formatDate(value: unknown) {
    return value != null && value !== '' ? String(value).slice(0, 10) : '-'
}

function displayText(value: unknown) {
    return value != null && value !== '' ? String(value) : '-'
}

export default async function FitUpPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const projectId = cookieStore.get('weld-control-project-id')?.value || null
    const searchParams = await props.searchParams
    const page = Number.parseInt(searchParams?.page || '0', 10)
    const limit = 100
    const offset = page * limit

    let welds: FitUpRow[] = []
    let total = 0

    if (projectId) {
        const { data, count } = await supabase
            .from('welds')
            .select('id, weld_id, drawing_no, goc_code, fitup_inspector, fitup_date, fitup_request_no, weld_finish_date, welders, weld_no, joint_type, weld_length, stage', { count: 'exact' })
            .eq('project_id', projectId)
            .not('fitup_date', 'is', null)
            .order('excel_row_order', { ascending: true })
            .range(offset, offset + limit - 1)

        welds = (data || []) as FitUpRow[]
        total = count || 0
    }

    const totalPages = Math.ceil(total / limit)
    const thStyle = { padding: '8px 12px', fontWeight: 600, color: '#475569', textAlign: 'left' as const, fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' as const }
    const tdStyle = { padding: '8px 12px', fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9', color: '#374151' }

    return (
        <div className="page-enter">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Fit-Up List</h1>
                    <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem' }}>
                        Tuong ung sheet <strong>FIT UP</strong> - {projectId ? `${total.toLocaleString()} moi han da Fit-Up` : 'Chon du an de xem'}
                    </p>
                </div>
            </div>

            {!projectId ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>
                    Vui long chon Du an o menu ben trai.
                </div>
            ) : (
                <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>#</th>
                                <th style={thStyle}>Weld ID</th>
                                <th style={thStyle}>Drawing No</th>
                                <th style={thStyle}>Weld No</th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Length</th>
                                <th style={thStyle}>GOC Code</th>
                                <th style={thStyle}>FU Inspector</th>
                                <th style={thStyle}>FU Date</th>
                                <th style={thStyle}>FU Request</th>
                                <th style={thStyle}>Weld Finish</th>
                                <th style={thStyle}>Welders</th>
                                <th style={thStyle}>Stage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {welds.length === 0 ? (
                                <tr>
                                    <td colSpan={13} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        Chua co moi han nao co du lieu Fit-Up.
                                    </td>
                                </tr>
                            ) : welds.map((weld, index) => (
                                <tr key={weld.id} style={{ background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                                    <td style={{ ...tdStyle, color: '#94a3b8' }}>{index + 1}</td>
                                    <td style={tdStyle}>
                                        <Link href={`/welds/${weld.id}`} style={{ color: '#1e40af', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem', textDecoration: 'none' }}>
                                            {displayText(weld.weld_id)}
                                        </Link>
                                    </td>
                                    <td style={tdStyle}>{displayText(weld.drawing_no)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{displayText(weld.weld_no)}</td>
                                    <td style={tdStyle}>{displayText(weld.joint_type)}</td>
                                    <td style={tdStyle}>{weld.weld_length != null ? `${weld.weld_length}mm` : '-'}</td>
                                    <td style={tdStyle}>{displayText(weld.goc_code)}</td>
                                    <td style={tdStyle}>{displayText(weld.fitup_inspector)}</td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(weld.fitup_date)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: '#2563eb' }}>{displayText(weld.fitup_request_no)}</td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(weld.weld_finish_date)}</td>
                                    <td style={tdStyle}>{displayText(weld.welders)}</td>
                                    <td style={tdStyle}>
                                        <span style={{ padding: '2px 7px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600, fontSize: '0.7rem' }}>
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
                        Trang {page + 1}/{totalPages} - Khop {total} moi han
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {page > 0 && (
                            <Link href={`?page=${page - 1}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                                Truoc
                            </Link>
                        )}
                        {page < totalPages - 1 && (
                            <Link href={`?page=${page + 1}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                                Sau
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}


