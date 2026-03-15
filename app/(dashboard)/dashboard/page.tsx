import Link from 'next/link'
import { cookies } from 'next/headers'
import { fetchAllBatches } from '@/lib/fetch-all-batches'
import { createClient } from '@/lib/supabase/server'
import { getDisplayWeldId } from '@/lib/weld-id'
import { WeldStats } from '@/types'

export default async function DashboardPage() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const currentProjectId = cookieStore.get('weld-control-project-id')?.value || null

    if (!currentProjectId) {
        return (
            <div className="page-enter" style={{ padding: '24px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Dashboard</h1>
                <div style={{ background: 'white', padding: '40px', borderRadius: '12px', color: '#64748b' }}>
                    Vui lòng chọn dự án ở menu bên trái để xem thống kê.
                </div>
            </div>
        )
    }

    const { data: project } = await supabase
        .from('projects')
        .select('name, code')
        .eq('id', currentProjectId)
        .single()

    const { data: statsData } = await supabase
        .from('vw_weld_stats')
        .select('*')
        .eq('project_id', currentProjectId)
        .single()

    const stats = statsData as WeldStats | null

    const { data: recentWelds } = await supabase
        .from('welds')
        .select('id, weld_id, weld_no, drawing_no, joint_type, stage, final_status, mt_result, ut_result, updated_at')
        .eq('project_id', currentProjectId)
        .order('updated_at', { ascending: false })
        .limit(10)

    const stageStats = await fetchAllBatches({
        fetchPage: async (from, to) => {
            const { data, error } = await supabase
                .from('welds')
                .select('stage')
                .eq('project_id', currentProjectId)
                .range(from, to)

            if (error) {
                throw new Error(error.message)
            }

            return (data || []) as Array<{ stage: string | null }>
        },
    })

    const stageCounts: Record<string, number> = {}
    stageStats.forEach(weld => {
        const stage = weld.stage || 'unknown'
        stageCounts[stage] = (stageCounts[stage] || 0) + 1
    })

    const gocStats = await fetchAllBatches({
        fetchPage: async (from, to) => {
            const { data, error } = await supabase
                .from('welds')
                .select('goc_code')
                .eq('project_id', currentProjectId)
                .range(from, to)

            if (error) {
                throw new Error(error.message)
            }

            return (data || []) as Array<{ goc_code: string | null }>
        },
    })

    const gocCounts: Record<string, number> = {}
    gocStats.forEach(weld => {
        if (weld.goc_code) {
            gocCounts[weld.goc_code] = (gocCounts[weld.goc_code] || 0) + 1
        }
    })
    const topGoc = Object.entries(gocCounts)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)

    const totalWelds = stats?.total_welds || 0
    const completedWelds = stats?.completed_welds || 0
    const repairWelds = stats?.repair_welds || 0
    const pendingWelds = stats?.pending_welds || 0
    const completionPct = totalWelds > 0 ? Math.round((completedWelds * 100) / totalWelds) : 0

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Dashboard</h1>
                <p style={{ color: '#64748b', marginTop: '4px' }}>
                    Tổng quan tiến độ hàn - Dự án: {project?.code} - {project?.name}
                </p>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px',
                }}
            >
                <div className="stat-card" style={{ borderColor: '#3b82f6' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e40af' }}>{totalWelds.toLocaleString()}</div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Tổng mối hàn</div>
                </div>

                <div className="stat-card" style={{ borderColor: '#22c55e' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#166534' }}>{completedWelds.toLocaleString()}</div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Hoàn thành</div>
                    <div style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 600 }}>{completionPct}%</div>
                </div>

                <div className="stat-card" style={{ borderColor: '#f59e0b' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#92400e' }}>{pendingWelds.toLocaleString()}</div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Đang chờ</div>
                </div>

                <div className="stat-card" style={{ borderColor: '#ef4444' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#991b1b' }}>{repairWelds.toLocaleString()}</div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Cần sửa chữa</div>
                </div>

                <div className="stat-card" style={{ borderColor: '#8b5cf6' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#5b21b6' }}>{completionPct}%</div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Tiến độ hoàn thành</div>
                    <div
                        style={{
                            marginTop: '8px',
                            height: '6px',
                            background: '#e2e8f0',
                            borderRadius: '3px',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                width: `${completionPct}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)',
                                borderRadius: '3px',
                                transition: 'width 0.5s ease',
                            }}
                        />
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr',
                    gap: '16px',
                    marginBottom: '24px',
                }}
            >
                <div
                    style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                >
                    <h3 style={{ fontWeight: 600, marginBottom: '16px', color: '#0f172a' }}>Tiến độ theo giai đoạn</h3>
                    {[ 
                        { key: 'fitup', label: 'Fit-Up', color: '#3b82f6' },
                        { key: 'welding', label: 'Welding', color: '#f59e0b' },
                        { key: 'visual', label: 'Visual', color: '#f97316' },
                        { key: 'request', label: 'REQUEST', color: '#0ea5e9' },
                        { key: 'backgouge', label: 'Backgouge', color: '#8b5cf6' },
                        { key: 'lamcheck', label: 'Lamcheck', color: '#10b981' },
                        { key: 'ndt', label: 'NDT', color: '#ec4899' },
                        { key: 'release', label: 'Release', color: '#16a34a' },
                        { key: 'cutoff', label: 'Cut-Off', color: '#64748b' },
                        { key: 'mw1', label: 'MW1', color: '#06b6d4' },
                        { key: 'completed', label: 'Completed', color: '#22c55e' },
                    ].map(stage => {
                        const count = stageCounts[stage.key] || 0
                        const percentage = totalWelds > 0 ? Math.round((count * 100) / totalWelds) : 0

                        return (
                            <div key={stage.key} style={{ marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#374151' }}>{stage.label}</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: stage.color }}>{count}</span>
                                </div>
                                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div
                                        style={{
                                            width: `${percentage}%`,
                                            height: '100%',
                                            background: stage.color,
                                            borderRadius: '3px',
                                        }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div
                    style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontWeight: 600, color: '#0f172a' }}>Mối hàn cập nhật gần đây</h3>
                        <Link href="/welds" style={{ color: '#3b82f6', fontSize: '0.875rem', textDecoration: 'none' }}>
                            Xem tất cả {'->'}
                        </Link>
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
                                            <Link href={`/welds/${weld.id}`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500, fontSize: '0.8rem' }}>
                                                {getDisplayWeldId(weld.weld_id)}
                                            </Link>
                                        </td>
                                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{weld.drawing_no?.split('-WM')[0]}</td>
                                        <td>
                                            <span style={{ fontWeight: 600 }}>{weld.joint_type}</span>
                                        </td>
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

            <div
                style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
            >
                <h3 style={{ fontWeight: 600, marginBottom: '16px', color: '#0f172a' }}>Top khu vực (GOC Code)</h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {topGoc.map(([code, count]) => (
                        <div
                            key={code}
                            style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                minWidth: '120px',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e40af' }}>{count}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>{code}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function ResultBadge({ result }: { result: string | null }) {
    const styleMap: Record<string, { bg: string; color: string; label: string }> = {
        ACC: { bg: '#dcfce7', color: '#166534', label: 'ACC' },
        REJ: { bg: '#fee2e2', color: '#991b1b', label: 'REJ' },
        'N/A': { bg: '#f1f5f9', color: '#64748b', label: 'N/A' },
    }

    const style = result ? styleMap[result] : styleMap['N/A']

    return (
        <span
            style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                background: style?.bg || '#f1f5f9',
                color: style?.color || '#64748b',
            }}
        >
            {result || '-'}
        </span>
    )
}

function StageBadge({ stage }: { stage: string }) {
    const colorMap: Record<string, string> = {
        completed: '#22c55e',
        rejected: '#ef4444',
        request: '#ec4899',
        ndt: '#06b6d4',
        release: '#16a34a',
        cutoff: '#64748b',
        mw1: '#0891b2',
        visual: '#f97316',
        welding: '#f59e0b',
        fitup: '#3b82f6',
    }

    const color = colorMap[stage] || '#94a3b8'

    return (
        <span
            style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                background: `${color}20`,
                color,
                textTransform: 'uppercase',
            }}
        >
            {stage}
        </span>
    )
}
