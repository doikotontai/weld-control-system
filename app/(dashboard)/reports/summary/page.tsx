import SummaryExportPanel from '@/app/(dashboard)/reports/SummaryExportPanel'
import { requireDashboardAuth } from '@/lib/dashboard-auth'
import { fetchAllBatches } from '@/lib/fetch-all-batches'

export const dynamic = 'force-dynamic'

interface SummaryStats {
    total: number
    withFitup: number
    withVisual: number
    withBG: number
    withLC: number
    withMT: number
    mtAcc: number
    mtRej: number
    withUT: number
    utAcc: number
    utRej: number
    withRT: number
    rtAcc: number
    rtRej: number
    withRelease: number
    withPWHT: number
    totalLength: number
    totalDefect: number
    isRepair: number
    byStage: Record<string, number>
    byDrawing: number
}

interface SummaryRow {
    stage: string | null
    fitup_date: string | null
    visual_date: string | null
    backgouge_date: string | null
    lamcheck_date: string | null
    mt_result: string | null
    ut_result: string | null
    rt_result: string | null
    pwht_result: string | null
    release_note_no: string | null
    release_note_date: string | null
    transmittal_no: string | null
    mw1_no: string | null
    cut_off: string | null
    weld_length: number | null
    defect_length: number | null
    is_repair: boolean | null
    drawing_no: string | null
    weld_id: string | null
    weld_no: string | null
    joint_type: string | null
    wps_no: string | null
    weld_size: string | null
    ndt_requirements: string | null
    goc_code: string | null
    weld_finish_date: string | null
    welders: string | null
    overall_status: string | null
    excel_row_order: number | null
}

function percentage(part: number, total: number) {
    return total > 0 ? Math.round((part * 100) / total) : 0
}

function SummaryCard({
    label,
    value,
    sub,
    color = '#1e40af',
    background = '#dbeafe',
}: {
    label: string
    value: string | number
    sub?: string
    color?: string
    background?: string
}) {
    return (
        <div style={{ background, borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color, marginTop: 2 }}>{label}</div>
            {sub ? <div style={{ fontSize: '0.7rem', color, opacity: 0.78, marginTop: 2 }}>{sub}</div> : null}
        </div>
    )
}

function StageRow({ stage, count, total }: { stage: string; count: number; total: number }) {
    const stagePercent = percentage(count, total)
    const colors: Record<string, string> = {
        completed: '#166534',
        fitup: '#1e40af',
        welding: '#92400e',
        visual: '#7c3aed',
        request: '#0f766e',
        backgouge: '#c2410c',
        lamcheck: '#065f46',
        ndt: '#db2777',
        release: '#15803d',
        cutoff: '#475569',
        mw1: '#0891b2',
        rejected: '#b91c1c',
    }
    const color = colors[stage] || '#374151'

    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.875rem', color: '#374151', textTransform: 'capitalize' }}>{stage}</span>
                <span style={{ fontWeight: 700, color }}>
                    {count} ({stagePercent}%)
                </span>
            </div>
            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${stagePercent}%`, height: '100%', background: color, borderRadius: 999 }} />
            </div>
        </div>
    )
}

export default async function SummaryReportPage() {
    const { supabase, cookieStore } = await requireDashboardAuth(['admin', 'dcc', 'qc', 'viewer'])
    const projectId = cookieStore.get('weld-control-project-id')?.value || null

    const stats: SummaryStats = {
        total: 0,
        withFitup: 0,
        withVisual: 0,
        withBG: 0,
        withLC: 0,
        withMT: 0,
        mtAcc: 0,
        mtRej: 0,
        withUT: 0,
        utAcc: 0,
        utRej: 0,
        withRT: 0,
        rtAcc: 0,
        rtRej: 0,
        withRelease: 0,
        withPWHT: 0,
        totalLength: 0,
        totalDefect: 0,
        isRepair: 0,
        byStage: {},
        byDrawing: 0,
    }

    let exportRows: SummaryRow[] = []

    if (projectId) {
        exportRows = await fetchAllBatches({
            fetchPage: async (from, to) => {
                const { data, error } = await supabase
                    .from('welds')
                    .select(
                        'stage, fitup_date, visual_date, backgouge_date, lamcheck_date, mt_result, ut_result, rt_result, pwht_result, release_note_no, release_note_date, transmittal_no, mw1_no, cut_off, weld_length, defect_length, is_repair, drawing_no, weld_id, weld_no, joint_type, wps_no, weld_size, ndt_requirements, goc_code, weld_finish_date, welders, overall_status, excel_row_order'
                    )
                    .eq('project_id', projectId)
                    .range(from, to)

                if (error) {
                    throw new Error(error.message)
                }

                return (data || []) as SummaryRow[]
            },
        })

        const drawings = new Set<string>()
        for (const row of exportRows) {
            stats.total += 1
            if (row.drawing_no) drawings.add(row.drawing_no)
            if (row.fitup_date) stats.withFitup += 1
            if (row.visual_date) stats.withVisual += 1
            if (row.backgouge_date) stats.withBG += 1
            if (row.lamcheck_date) stats.withLC += 1
            if (row.mt_result) {
                stats.withMT += 1
                if (row.mt_result === 'ACC') stats.mtAcc += 1
                if (row.mt_result === 'REJ') stats.mtRej += 1
            }
            if (row.ut_result) {
                stats.withUT += 1
                if (row.ut_result === 'ACC') stats.utAcc += 1
                if (row.ut_result === 'REJ') stats.utRej += 1
            }
            if (row.rt_result) {
                stats.withRT += 1
                if (row.rt_result === 'ACC') stats.rtAcc += 1
                if (row.rt_result === 'REJ') stats.rtRej += 1
            }
            if (row.release_note_no) stats.withRelease += 1
            if (row.pwht_result) stats.withPWHT += 1
            stats.totalLength += Number(row.weld_length) || 0
            stats.totalDefect += Number(row.defect_length) || 0
            if (row.is_repair) stats.isRepair += 1

            const stage = row.stage || 'unknown'
            stats.byStage[stage] = (stats.byStage[stage] || 0) + 1
        }

        stats.byDrawing = drawings.size
    }

    const overallRepairRate =
        stats.totalLength > 0 ? ((stats.totalDefect / stats.totalLength) * 100).toFixed(2) : '0'

    return (
        <div className="page-enter">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                Báo cáo tổng hợp
            </h1>
            <p style={{ color: '#64748b', marginBottom: 20, fontSize: '0.875rem' }}>
                Tương ứng sheet <strong>RESULT + tota(lN)</strong> - số liệu tổng quan của dự án đang chọn.
            </p>

            {!projectId ? (
                <div
                    style={{
                        padding: 40,
                        textAlign: 'center',
                        background: 'white',
                        borderRadius: 12,
                        color: '#64748b',
                    }}
                >
                    Vui lòng chọn dự án ở menu bên trái.
                </div>
            ) : (
                <>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: 12,
                            marginBottom: 24,
                        }}
                    >
                        <SummaryCard label="Tổng mối hàn" value={stats.total.toLocaleString()} />
                        <SummaryCard
                            label="Bản vẽ"
                            value={stats.byDrawing}
                            color="#0369a1"
                            background="#e0f2fe"
                        />
                        <SummaryCard
                            label="Tổng chiều dài (mm)"
                            value={stats.totalLength.toLocaleString()}
                            color="#374151"
                            background="#f8fafc"
                        />
                        <SummaryCard
                            label="Đã có release note"
                            value={stats.withRelease}
                            sub={`${percentage(stats.withRelease, stats.total)}%`}
                            color="#166534"
                            background="#dcfce7"
                        />
                        <SummaryCard
                            label="Repair Rate"
                            value={`${overallRepairRate}%`}
                            color={Number(overallRepairRate) < 5 ? '#166534' : '#991b1b'}
                            background={Number(overallRepairRate) < 5 ? '#dcfce7' : '#fee2e2'}
                        />
                        <SummaryCard
                            label="Phải sửa"
                            value={stats.isRepair}
                            color="#dc2626"
                            background="#fee2e2"
                        />
                    </div>

                    <SummaryExportPanel rows={exportRows} />

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: 16,
                            marginBottom: 20,
                        }}
                    >
                        <div
                            style={{
                                background: 'white',
                                borderRadius: 12,
                                padding: 20,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            }}
                        >
                            <h3 style={{ fontWeight: 700, marginBottom: 16, color: '#0f172a' }}>
                                Tiến độ từng công đoạn
                            </h3>
                            {[
                                { label: 'Fit-Up', count: stats.withFitup },
                                { label: 'Visual', count: stats.withVisual },
                                { label: 'Backgouge', count: stats.withBG },
                                { label: 'Lamcheck', count: stats.withLC },
                                { label: 'MT', count: stats.withMT },
                                { label: 'UT', count: stats.withUT },
                                { label: 'RT', count: stats.withRT },
                                { label: 'PWHT', count: stats.withPWHT },
                                { label: 'Release Note', count: stats.withRelease },
                            ].map((item) => {
                                const progress = percentage(item.count, stats.total)
                                return (
                                    <div key={item.label} style={{ marginBottom: 10 }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: 3,
                                            }}
                                        >
                                            <span style={{ fontSize: '0.85rem' }}>{item.label}</span>
                                            <span
                                                style={{
                                                    fontSize: '0.85rem',
                                                    fontWeight: 700,
                                                    color: '#1e40af',
                                                }}
                                            >
                                                {item.count.toLocaleString()} ({progress}%)
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                height: 6,
                                                background: '#e2e8f0',
                                                borderRadius: 999,
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: `${progress}%`,
                                                    height: '100%',
                                                    background: '#3b82f6',
                                                    borderRadius: 999,
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
                                borderRadius: 12,
                                padding: 20,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            }}
                        >
                            <h3 style={{ fontWeight: 700, marginBottom: 16, color: '#0f172a' }}>
                                Kết quả NDT
                            </h3>
                            {[
                                { type: 'MT', total: stats.withMT, acc: stats.mtAcc, rej: stats.mtRej },
                                { type: 'UT', total: stats.withUT, acc: stats.utAcc, rej: stats.utRej },
                                { type: 'RT', total: stats.withRT, acc: stats.rtAcc, rej: stats.rtRej },
                            ].map((item) => (
                                <div
                                    key={item.type}
                                    style={{
                                        marginBottom: 16,
                                        padding: 12,
                                        background: '#f8fafc',
                                        borderRadius: 8,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            marginBottom: 8,
                                            color: '#0f172a',
                                        }}
                                    >
                                        {item.type} - {item.total} mối
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <div
                                            style={{
                                                textAlign: 'center',
                                                background: '#dcfce7',
                                                borderRadius: 6,
                                                padding: 8,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    fontSize: '1.2rem',
                                                    color: '#166534',
                                                }}
                                            >
                                                {item.acc}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '0.7rem',
                                                    color: '#166534',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                ACC
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                textAlign: 'center',
                                                background: '#fee2e2',
                                                borderRadius: 6,
                                                padding: 8,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    fontSize: '1.2rem',
                                                    color: '#991b1b',
                                                }}
                                            >
                                                {item.rej}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '0.7rem',
                                                    color: '#991b1b',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                REJ
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div style={{ marginTop: 12 }}>
                                <h4 style={{ fontWeight: 700, marginBottom: 12, color: '#0f172a' }}>
                                    Phân bố theo stage
                                </h4>
                                {Object.entries(stats.byStage)
                                    .sort((left, right) => right[1] - left[1])
                                    .map(([stage, count]) => (
                                        <StageRow key={stage} stage={stage} count={count} total={stats.total} />
                                    ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
