import { requireDashboardAuth } from '@/lib/dashboard-auth'

export const dynamic = 'force-dynamic'

interface WelderNdtSourceRow {
    welders: string | null
    weld_length: number | null
    defect_length: number | null
    mt_result: string | null
    ut_result: string | null
    rt_result: string | null
    release_note_no: string | null
}

interface WelderNdtStat {
    welder: string
    total: number
    length: number
    defect: number
    repairRate: number
    mtAcc: number
    mtRej: number
    utAcc: number
    utRej: number
    rtAcc: number
    rtRej: number
    irnDone: number
}

function splitWelders(value: string | null) {
    const welders = (value || '').split(/[;,/]/).map((item) => item.trim()).filter(Boolean)
    return welders.length > 0 ? welders : ['(Chưa rõ)']
}

function RateBadge({ rate }: { rate: number }) {
    const color = rate === 0 ? '#166534' : rate < 5 ? '#0369a1' : rate < 10 ? '#92400e' : '#991b1b'
    const background = rate === 0 ? '#dcfce7' : rate < 5 ? '#dbeafe' : rate < 10 ? '#fef9c3' : '#fee2e2'
    return <span style={{ padding: '3px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', background, color }}>{rate.toFixed(2)}%</span>
}

function ResultSummary({ acc, rej }: { acc: number; rej: number }) {
    if (acc + rej === 0) return <span style={{ color: '#94a3b8' }}>-</span>
    return (
        <span>
            {acc > 0 && <span style={{ color: '#166534', fontWeight: 600 }}>{acc}A</span>}{' '}
            {rej > 0 && <span style={{ color: '#991b1b', fontWeight: 600 }}>{rej}R</span>}
        </span>
    )
}

export default async function WelderNDTPage() {
    const { supabase, cookieStore } = await requireDashboardAuth(['admin', 'dcc', 'qc'])
    const projectId = cookieStore.get('weld-control-project-id')?.value || null

    let welderStats: WelderNdtStat[] = []

    if (projectId) {
        const { data } = await supabase
            .from('welds')
            .select('welders, weld_length, defect_length, mt_result, ut_result, rt_result, release_note_no')
            .eq('project_id', projectId)

        if (data) {
            const statsMap: Record<string, Omit<WelderNdtStat, 'repairRate'>> = {}

            ;(data as WelderNdtSourceRow[]).forEach((row) => {
                splitWelders(row.welders).forEach((welder) => {
                    if (!statsMap[welder]) {
                        statsMap[welder] = { welder, total: 0, length: 0, defect: 0, mtAcc: 0, mtRej: 0, utAcc: 0, utRej: 0, rtAcc: 0, rtRej: 0, irnDone: 0 }
                    }

                    const stat = statsMap[welder]
                    stat.total += 1
                    stat.length += Number(row.weld_length) || 0
                    stat.defect += Number(row.defect_length) || 0
                    if (row.mt_result === 'ACC') stat.mtAcc += 1
                    if (row.mt_result === 'REJ') stat.mtRej += 1
                    if (row.ut_result === 'ACC') stat.utAcc += 1
                    if (row.ut_result === 'REJ') stat.utRej += 1
                    if (row.rt_result === 'ACC') stat.rtAcc += 1
                    if (row.rt_result === 'REJ') stat.rtRej += 1
                    if (row.release_note_no) stat.irnDone += 1
                })
            })

            welderStats = Object.values(statsMap)
                .map((stat) => ({
                    ...stat,
                    repairRate: stat.length > 0 ? Math.round((stat.defect * 10000) / stat.length) / 100 : 0,
                }))
                .sort((left, right) => right.repairRate - left.repairRate)
        }
    }

    const thStyle = { padding: '10px 14px', fontWeight: 600, color: '#475569', textAlign: 'left' as const, fontSize: '0.75rem', textTransform: 'uppercase' as const, background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }
    const tdStyle = { padding: '10px 14px', fontSize: '0.85rem', borderBottom: '1px solid #f1f5f9' }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>NDT theo thợ hàn</h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem' }}>
                    Tương ứng sheet <strong>KQ HAN(IN)</strong> - {welderStats.length} thợ hàn | sắp xếp theo repair rate giảm dần
                </p>
            </div>

            {!projectId ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>Vui lòng chọn dự án ở menu bên trái.</div>
            ) : (
                <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>#</th>
                                <th style={thStyle}>Welder ID</th>
                                <th style={thStyle}>Total Welds</th>
                                <th style={thStyle}>Total Length (mm)</th>
                                <th style={thStyle}>Defect (mm)</th>
                                <th style={thStyle}>Repair Rate</th>
                                <th style={thStyle}>MT (ACC/REJ)</th>
                                <th style={thStyle}>UT (ACC/REJ)</th>
                                <th style={thStyle}>RT (ACC/REJ)</th>
                                <th style={thStyle}>Release Note Done</th>
                            </tr>
                        </thead>
                        <tbody>
                            {welderStats.length === 0 ? (
                                <tr>
                                    <td colSpan={10} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Không có dữ liệu</td>
                                </tr>
                            ) : welderStats.map((stat, index) => (
                                <tr key={stat.welder} style={{ background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                                    <td style={{ ...tdStyle, color: '#94a3b8' }}>{index + 1}</td>
                                    <td style={{ ...tdStyle, fontWeight: 700, fontFamily: 'monospace', color: '#1e40af' }}>{stat.welder}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600, textAlign: 'center' as const }}>{stat.total}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' as const }}>{stat.length.toLocaleString()}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' as const, color: stat.defect > 0 ? '#dc2626' : '#374151' }}>{stat.defect > 0 ? stat.defect.toFixed(0) : '-'}</td>
                                    <td style={tdStyle}><RateBadge rate={stat.repairRate} /></td>
                                    <td style={tdStyle}><ResultSummary acc={stat.mtAcc} rej={stat.mtRej} /></td>
                                    <td style={tdStyle}><ResultSummary acc={stat.utAcc} rej={stat.utRej} /></td>
                                    <td style={tdStyle}><ResultSummary acc={stat.rtAcc} rej={stat.rtRej} /></td>
                                    <td style={{ ...tdStyle, textAlign: 'center' as const, fontWeight: 600, color: '#0369a1' }}>{stat.irnDone || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}


