import Link from 'next/link'
import { requireDashboardAuth } from '@/lib/dashboard-auth'
import SyncedTableFrame from '@/components/SyncedTableFrame'

export const dynamic = 'force-dynamic'

interface NdtRow {
    id: string
    weld_id: string | null
    drawing_no: string | null
    weld_no: string | null
    joint_type: string | null
    ndt_requirements: string | null
    mt_result: string | null
    mt_report_no: string | null
    ut_result: string | null
    ut_report_no: string | null
    rt_result: string | null
    rt_report_no: string | null
    pwht_result: string | null
    release_note_no: string | null
    release_note_date: string | null
    defect_length: number | null
    repair_length: number | null
    welders: string | null
}

interface NdtStatsRow {
    mt_result: string | null
    ut_result: string | null
    rt_result: string | null
}

function formatDate(value: unknown) {
    return value != null && value !== '' ? String(value).slice(0, 10) : '-'
}

function displayText(value: unknown) {
    return value != null && value !== '' ? String(value) : '-'
}

function ResultBadge({ value }: { value: string | null }) {
    if (!value) {
        return <span style={{ color: '#94a3b8' }}>-</span>
    }

    const accepted = value === 'ACC'
    const rejected = value === 'REJ'

    return (
        <span
            style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '0.7rem',
                background: accepted ? '#dcfce7' : rejected ? '#fee2e2' : '#f1f5f9',
                color: accepted ? '#166534' : rejected ? '#991b1b' : '#64748b',
            }}
        >
            {value}
        </span>
    )
}

export default async function NDTPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const { supabase, cookieStore } = await requireDashboardAuth(['admin', 'dcc', 'qc', 'inspector'])
    const projectId = cookieStore.get('weld-control-project-id')?.value || null
    const searchParams = await props.searchParams
    const page = Number.parseInt(searchParams?.page || '0', 10)
    const limit = 100
    const offset = page * limit

    let welds: NdtRow[] = []
    let total = 0
    let mtAcc = 0
    let mtRej = 0
    let utAcc = 0
    let utRej = 0
    let rtAcc = 0
    let rtRej = 0

    if (projectId) {
        const { data, count } = await supabase
            .from('welds')
            .select('id, weld_id, drawing_no, weld_no, joint_type, ndt_requirements, mt_result, mt_report_no, ut_result, ut_report_no, rt_result, rt_report_no, pwht_result, release_note_no, release_note_date, defect_length, repair_length, welders', { count: 'exact' })
            .eq('project_id', projectId)
            .or('mt_result.not.is.null,ut_result.not.is.null,rt_result.not.is.null')
            .order('excel_row_order', { ascending: true })
            .range(offset, offset + limit - 1)

        welds = (data || []) as NdtRow[]
        total = count || 0

        const { data: statsData } = await supabase
            .from('welds')
            .select('mt_result, ut_result, rt_result')
            .eq('project_id', projectId)
            .or('mt_result.not.is.null,ut_result.not.is.null,rt_result.not.is.null')

        ;(statsData || []).forEach((row) => {
            const stat = row as NdtStatsRow
            if (stat.mt_result === 'ACC') mtAcc += 1
            if (stat.mt_result === 'REJ') mtRej += 1
            if (stat.ut_result === 'ACC') utAcc += 1
            if (stat.ut_result === 'REJ') utRej += 1
            if (stat.rt_result === 'ACC') rtAcc += 1
            if (stat.rt_result === 'REJ') rtRej += 1
        })
    }

    const totalPages = Math.ceil(total / limit)
    const thStyle = { padding: '8px 12px', fontWeight: 600, color: '#475569', textAlign: 'left' as const, fontSize: '0.75rem', textTransform: 'uppercase' as const, background: '#f8fafc', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' as const }
    const tdStyle = { padding: '8px 12px', fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9', color: '#374151' }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>NDT Results</h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem' }}>
                    Tương ứng sheet <strong>REQUEST / NDT RESULTS</strong> - {projectId ? `${total.toLocaleString()} mối hàn có kết quả NDT` : 'Chọn dự án để xem'}
                </p>
            </div>

            {projectId && total > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '10px', marginBottom: '20px' }}>
                    {[
                        { label: 'MT ACC', value: mtAcc, bg: '#dcfce7', color: '#166534' },
                        { label: 'MT REJ', value: mtRej, bg: '#fee2e2', color: '#991b1b' },
                        { label: 'UT ACC', value: utAcc, bg: '#dcfce7', color: '#166534' },
                        { label: 'UT REJ', value: utRej, bg: '#fee2e2', color: '#991b1b' },
                        { label: 'RT ACC', value: rtAcc, bg: '#dcfce7', color: '#166534' },
                        { label: 'RT REJ', value: rtRej, bg: '#fee2e2', color: '#991b1b' },
                    ].map((card) => (
                        <div key={card.label} style={{ background: card.bg, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: card.color }}>{card.value}</div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: card.color, marginTop: '2px' }}>{card.label}</div>
                        </div>
                    ))}
                </div>
            )}

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
                                <th style={thStyle}>NDT Req</th>
                                <th style={thStyle}>MT</th>
                                <th style={thStyle}>MT Report</th>
                                <th style={thStyle}>UT</th>
                                <th style={thStyle}>UT Report</th>
                                <th style={thStyle}>RT</th>
                                <th style={thStyle}>RT Report</th>
                                <th style={thStyle}>PWHT</th>
                                <th style={thStyle}>Release Note</th>
                                <th style={thStyle}>Release Date</th>
                                <th style={thStyle}>Defect (mm)</th>
                                <th style={thStyle}>Repair (mm)</th>
                                <th style={thStyle}>Welders</th>
                            </tr>
                        </thead>
                        <tbody>
                            {welds.length === 0 ? (
                                <tr>
                                    <td colSpan={18} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        Chưa có mối hàn nào có kết quả NDT.
                                    </td>
                                </tr>
                            ) : welds.map((weld, index) => (
                                <tr key={weld.id} style={{ background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                                    <td style={{ ...tdStyle, color: '#94a3b8' }}>{index + 1}</td>
                                    <td style={tdStyle}>
                                        <Link href={`/welds/${weld.id}`} style={{ color: '#854d0e', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem', textDecoration: 'none' }}>
                                            {displayText(weld.weld_id)}
                                        </Link>
                                    </td>
                                    <td style={tdStyle}>{displayText(weld.drawing_no)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{displayText(weld.weld_no)}</td>
                                    <td style={tdStyle}>{displayText(weld.joint_type)}</td>
                                    <td style={tdStyle}>{displayText(weld.ndt_requirements)}</td>
                                    <td style={tdStyle}><ResultBadge value={weld.mt_result} /></td>
                                    <td style={tdStyle}>{displayText(weld.mt_report_no)}</td>
                                    <td style={tdStyle}><ResultBadge value={weld.ut_result} /></td>
                                    <td style={tdStyle}>{displayText(weld.ut_report_no)}</td>
                                    <td style={tdStyle}><ResultBadge value={weld.rt_result} /></td>
                                    <td style={tdStyle}>{displayText(weld.rt_report_no)}</td>
                                    <td style={tdStyle}><ResultBadge value={weld.pwht_result} /></td>
                                    <td style={{ ...tdStyle, fontWeight: 700, color: '#0369a1' }}>{displayText(weld.release_note_no)}</td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(weld.release_note_date)}</td>
                                    <td style={tdStyle}>{weld.defect_length != null ? `${weld.defect_length}` : '-'}</td>
                                    <td style={tdStyle}>{weld.repair_length != null ? `${weld.repair_length}` : '-'}</td>
                                    <td style={tdStyle}>{displayText(weld.welders)}</td>
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

