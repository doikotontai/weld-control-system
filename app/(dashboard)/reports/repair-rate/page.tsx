import { requireDashboardAuth } from '@/lib/dashboard-auth'
import { fetchAllBatches } from '@/lib/fetch-all-batches'

export const dynamic = 'force-dynamic'

interface RepairRateSourceRow {
    welders: string | null
    weld_length: number | null
    defect_length: number | null
    repair_length: number | null
    mt_result: string | null
    ut_result: string | null
}

interface WelderRepairStat {
    welder: string
    total: number
    length: number
    defect: number
    repair: number
    mtRej: number
    utRej: number
    repairRate: number
}

function splitWelders(value: string | null) {
    const welders = (value || '').split(/[;,/]/).map((item) => item.trim()).filter(Boolean)
    return welders.length > 0 ? welders : ['(Ch?a r?)']
}

export default async function RepairRatePage() {
    const { supabase, cookieStore } = await requireDashboardAuth(['admin', 'dcc', 'qc'])
    const projectId = cookieStore.get('weld-control-project-id')?.value || null

    let welderStats: WelderRepairStat[] = []
    let totalWelds = 0
    let totalLength = 0
    let totalDefect = 0

    if (projectId) {
        const weldRows = await fetchAllBatches({
            fetchPage: async (from, to) => {
                const { data, error } = await supabase
                    .from('welds')
                    .select('welders, weld_length, defect_length, repair_length, mt_result, ut_result')
                    .eq('project_id', projectId)
                    .range(from, to)

                if (error) {
                    throw new Error(error.message)
                }

                return (data || []) as RepairRateSourceRow[]
            },
        })

        totalWelds = weldRows.length

        weldRows.forEach((row) => {
            totalLength += Number(row.weld_length) || 0
            totalDefect += Number(row.defect_length) || 0
        })

        const statsMap: Record<string, Omit<WelderRepairStat, 'repairRate'>> = {}

        weldRows.forEach((row) => {
            splitWelders(row.welders).forEach((welder) => {
                if (!statsMap[welder]) {
                    statsMap[welder] = { welder, total: 0, length: 0, defect: 0, repair: 0, mtRej: 0, utRej: 0 }
                }

                const stat = statsMap[welder]
                stat.total += 1
                stat.length += Number(row.weld_length) || 0
                stat.defect += Number(row.defect_length) || 0
                stat.repair += Number(row.repair_length) || 0
                if (row.mt_result === 'REJ') stat.mtRej += 1
                if (row.ut_result === 'REJ') stat.utRej += 1
            })
        })

        welderStats = Object.values(statsMap)
            .map((stat) => ({
                ...stat,
                repairRate: stat.length > 0 ? Math.round((stat.defect * 10000) / stat.length) / 100 : 0,
            }))
            .sort((left, right) => right.repairRate - left.repairRate)
    }

    const overallRate = totalLength > 0 ? (totalDefect / totalLength * 100).toFixed(2) : '0'

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Tỷ lệ repair theo thợ hàn</h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem' }}>Tương ứng sheet <strong>DULIEU</strong> - xếp hạng thợ hàn theo repair rate</p>
            </div>

            {projectId && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
                    {[
                        { label: 'Tổng mối hàn', value: totalWelds.toLocaleString(), color: '#1e40af', background: '#dbeafe' },
                        { label: 'Tổng độ dài (mm)', value: totalLength.toLocaleString(), color: '#0369a1', background: '#e0f2fe' },
                        { label: 'Tổng lỗi (mm)', value: totalDefect > 0 ? totalDefect.toFixed(0) : '0', color: '#dc2626', background: '#fee2e2' },
                        { label: 'Repair Rate tổng', value: `${overallRate}%`, color: Number(overallRate) < 5 ? '#166534' : Number(overallRate) < 10 ? '#92400e' : '#991b1b', background: Number(overallRate) < 5 ? '#dcfce7' : Number(overallRate) < 10 ? '#fef9c3' : '#fee2e2' },
                    ].map((card) => (
                        <div key={card.label} style={{ background: card.background, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: card.color }}>{card.value}</div>
                            <div style={{ fontSize: '0.75rem', color: card.color, marginTop: '4px', fontWeight: 600 }}>{card.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {!projectId ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>Vui lòng chọn dự án.</div>
            ) : (
                <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                {['Xếp hạng', 'Welder ID', 'Tổng mối', 'Độ dài (mm)', 'Lỗi (mm)', 'Repair Rate', 'MT REJ', 'UT REJ'].map((header) => (
                                    <th key={header} style={{ padding: '10px 14px', fontWeight: 600, color: '#475569', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {welderStats.map((stat, index) => {
                                const repairRateColor = stat.repairRate === 0 ? '#166534' : stat.repairRate < 5 ? '#0369a1' : stat.repairRate < 10 ? '#92400e' : '#991b1b'
                                const repairRateBackground = stat.repairRate === 0 ? '#dcfce7' : stat.repairRate < 5 ? '#dbeafe' : stat.repairRate < 10 ? '#fef9c3' : '#fee2e2'
                                const rankBadge = index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : `${index + 1}`

                                return (
                                    <tr key={stat.welder} style={{ background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                                        <td style={{ padding: '10px 14px', fontSize: '1rem', textAlign: 'center' }}>{rankBadge}</td>
                                        <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace', color: '#1e40af', fontSize: '0.875rem' }}>{stat.welder}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{stat.total}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#374151' }}>{stat.length.toLocaleString()}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right', color: stat.defect > 0 ? '#dc2626' : '#64748b', fontWeight: stat.defect > 0 ? 600 : 400 }}>{stat.defect > 0 ? stat.defect.toFixed(0) : '-'}</td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ padding: '3px 10px', borderRadius: '6px', background: repairRateBackground, color: repairRateColor, fontWeight: 700, fontSize: '0.85rem' }}>{stat.repairRate.toFixed(2)}%</span>
                                                <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                                                    <div style={{ width: `${Math.min(stat.repairRate * 5, 100)}%`, height: '100%', background: repairRateColor, borderRadius: '3px' }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 14px', textAlign: 'center', color: stat.mtRej > 0 ? '#dc2626' : '#94a3b8', fontWeight: stat.mtRej > 0 ? 700 : 400 }}>{stat.mtRej || '-'}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'center', color: stat.utRej > 0 ? '#dc2626' : '#94a3b8', fontWeight: stat.utRej > 0 ? 700 : 400 }}>{stat.utRej || '-'}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
