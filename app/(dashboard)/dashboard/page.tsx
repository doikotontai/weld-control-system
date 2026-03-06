// app/(dashboard)/dashboard/page.tsx
// Trang Dashboard chính — Hiển thị thống kê và tiến độ
import { createClient } from '@/lib/supabase/server'
import { WeldStats } from '@/types'

export default async function DashboardPage() {
    const supabase = await createClient()

    // Lấy số liệu từ view vw_weld_stats
    const { data: statsData } = await supabase
        .from('vw_weld_stats')
        .select('*')
        .single()

    const stats = statsData as WeldStats | null

    // Lấy 10 mối hàn mới nhất
    const { data: recentWelds } = await supabase
        .from('welds')
        .select('weld_id, weld_no, drawing_no, joint_type, stage, final_status, mt_result, ut_result, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10)

    // Lấy thống kê theo stage
    const { data: stageStats } = await supabase
        .from('welds')
        .select('stage')

    const stageCounts: Record<string, number> = {}
    stageStats?.forEach(w => {
        stageCounts[w.stage] = (stageCounts[w.stage] || 0) + 1
    })

    // Lấy thống kê theo khu vực (GOC code)
    const { data: gocStats } = await supabase
        .from('welds')
        .select('goc_code')

    const gocCounts: Record<string, number> = {}
    gocStats?.forEach(w => {
        if (w.goc_code) gocCounts[w.goc_code] = (gocCounts[w.goc_code] || 0) + 1
    })
    const topGoc = Object.entries(gocCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const totalWelds = stats?.total_welds || 0
    const completedWelds = stats?.completed_welds || 0
    const repairWelds = stats?.repair_welds || 0
    const pendingWelds = stats?.pending_welds || 0
    const completionPct = totalWelds > 0 ? Math.round(completedWelds * 100 / totalWelds) : 0

    return (
        <div className="page-enter">
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
                    📊 Dashboard
                </h1>
                <p style={{ color: '#64748b', marginTop: '4px' }}>
                    Tổng quan tiến độ hàn — THIEN NGA – HAI AU PHASE 1 PROJECT
                </p>
            </div>

            {/* Stat Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
            }}>
                {/* Total */}
                <div className="stat-card" style={{ borderColor: '#3b82f6' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e40af' }}>
                        {totalWelds.toLocaleString()}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
                        🔩 Tổng mối hàn
                    </div>
                </div>

                {/* Completed */}
                <div className="stat-card" style={{ borderColor: '#22c55e' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#166534' }}>
                        {completedWelds.toLocaleString()}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
                        ✅ Hoàn thành
                    </div>
                    <div style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 600 }}>
                        {completionPct}%
                    </div>
                </div>

                {/* Pending */}
                <div className="stat-card" style={{ borderColor: '#f59e0b' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#92400e' }}>
                        {pendingWelds.toLocaleString()}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
                        ⏳ Đang chờ
                    </div>
                </div>

                {/* Repair */}
                <div className="stat-card" style={{ borderColor: '#ef4444' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#991b1b' }}>
                        {repairWelds.toLocaleString()}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
                        🔄 Cần sửa chữa
                    </div>
                </div>

                {/* Completion % */}
                <div className="stat-card" style={{ borderColor: '#8b5cf6' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#5b21b6' }}>
                        {completionPct}%
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
                        📈 Tiến độ hoàn thành
                    </div>
                    {/* Progress bar */}
                    <div style={{
                        marginTop: '8px',
                        height: '6px',
                        background: '#e2e8f0',
                        borderRadius: '3px',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${completionPct}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)',
                            borderRadius: '3px',
                            transition: 'width 0.5s ease',
                        }} />
                    </div>
                </div>
            </div>

            {/* Two columns: Stage breakdown + Recent welds */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: '16px',
                marginBottom: '24px',
            }}>
                {/* Stage Breakdown */}
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '16px', color: '#0f172a' }}>
                        📍 Tiến độ theo Stage
                    </h3>
                    {[
                        { key: 'fitup', label: 'Fit-Up', color: '#3b82f6' },
                        { key: 'backgouge', label: 'Back Gouging', color: '#8b5cf6' },
                        { key: 'lamcheck', label: 'Lam. Check', color: '#6366f1' },
                        { key: 'welding', label: 'Welding', color: '#f59e0b' },
                        { key: 'visual', label: 'Visual Final', color: '#f97316' },
                        { key: 'mpi', label: 'MPI/MT', color: '#ec4899' },
                        { key: 'ut', label: 'UT', color: '#06b6d4' },
                        { key: 'pwht', label: 'PWHT', color: '#14b8a6' },
                        { key: 'completed', label: 'Completed', color: '#22c55e' },
                    ].map(stage => {
                        const count = stageCounts[stage.key] || 0
                        const pct = totalWelds > 0 ? Math.round(count * 100 / totalWelds) : 0
                        return (
                            <div key={stage.key} style={{ marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#374151' }}>{stage.label}</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: stage.color }}>{count}</span>
                                </div>
                                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${pct}%`,
                                        height: '100%',
                                        background: stage.color,
                                        borderRadius: '3px',
                                    }} />
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Recent Welds */}
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontWeight: 600, color: '#0f172a' }}>🕐 Mối hàn cập nhật gần đây</h3>
                        <a href="/welds" style={{ color: '#3b82f6', fontSize: '0.875rem', textDecoration: 'none' }}>
                            Xem tất cả →
                        </a>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Weld ID</th>
                                    <th>Bản vẽ</th>
                                    <th>Loại</th>
                                    <th>MT</th>
                                    <th>UT</th>
                                    <th>Stage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentWelds?.map(weld => (
                                    <tr key={weld.weld_id}>
                                        <td>
                                            <a href={`/welds/${weld.weld_id}`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500, fontSize: '0.8rem' }}>
                                                {weld.weld_id}
                                            </a>
                                        </td>
                                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{weld.drawing_no?.split('-WM')[0]}</td>
                                        <td><span style={{ fontWeight: 600 }}>{weld.joint_type}</span></td>
                                        <td>
                                            <ResultBadge result={weld.mt_result} />
                                        </td>
                                        <td>
                                            <ResultBadge result={weld.ut_result} />
                                        </td>
                                        <td>
                                            <StageBadge stage={weld.stage} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Top GOC Areas */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
                <h3 style={{ fontWeight: 600, marginBottom: '16px', color: '#0f172a' }}>
                    📍 Top khu vực (GOC Code)
                </h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {topGoc.map(([code, count]) => (
                        <div key={code} style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            minWidth: '120px',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e40af' }}>{count}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>{code}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Helper components
function ResultBadge({ result }: { result: string | null }) {
    const map: Record<string, { bg: string; color: string; label: string }> = {
        ACC: { bg: '#dcfce7', color: '#166534', label: 'ACC' },
        REJ: { bg: '#fee2e2', color: '#991b1b', label: 'REJ' },
        'N/A': { bg: '#f1f5f9', color: '#64748b', label: 'N/A' },
    }
    const style = result ? map[result] : map['N/A']
    return (
        <span style={{
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 600,
            background: style?.bg || '#f1f5f9',
            color: style?.color || '#64748b',
        }}>
            {result || '—'}
        </span>
    )
}

function StageBadge({ stage }: { stage: string }) {
    const map: Record<string, string> = {
        completed: '#22c55e',
        rejected: '#ef4444',
        mpi: '#ec4899',
        ut: '#06b6d4',
        visual: '#f97316',
        welding: '#f59e0b',
        fitup: '#3b82f6',
    }
    const color = map[stage] || '#94a3b8'
    return (
        <span style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 600,
            background: color + '20',
            color: color,
            textTransform: 'uppercase',
        }}>
            {stage}
        </span>
    )
}
