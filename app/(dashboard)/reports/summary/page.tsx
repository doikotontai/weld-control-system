// app/(dashboard)/reports/summary/page.tsx — tota(lN) sheet equivalent
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function SummaryReportPage() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const projectId = cookieStore.get('weld-control-project-id')?.value || null

    let stats = {
        total: 0, withFitup: 0, withVisual: 0, withBG: 0, withLC: 0,
        withMT: 0, mtAcc: 0, mtRej: 0,
        withUT: 0, utAcc: 0, utRej: 0,
        withRT: 0, rtAcc: 0, rtRej: 0,
        withIRN: 0, withPWHT: 0,
        totalLength: 0, totalDefect: 0,
        isRepair: 0,
        byStage: {} as Record<string, number>,
        byDrawing: 0,
    }

    if (projectId) {
        const { data } = await (supabase.from('welds') as any)
            .select('stage, fitup_date, visual_date, backgouge_date, lamcheck_date, mt_result, ut_result, rt_result, pwht_result, irn_no, weld_length, defect_length, is_repair, drawing_no')
            .eq('project_id', projectId)

        if (data) {
            const drawings = new Set<string>()
            data.forEach((w: any) => {
                stats.total++
                if (w.drawing_no) drawings.add(w.drawing_no)
                if (w.fitup_date) stats.withFitup++
                if (w.visual_date) stats.withVisual++
                if (w.backgouge_date) stats.withBG++
                if (w.lamcheck_date) stats.withLC++
                if (w.mt_result) { stats.withMT++; if (w.mt_result === 'ACC') stats.mtAcc++; if (w.mt_result === 'REJ') stats.mtRej++ }
                if (w.ut_result) { stats.withUT++; if (w.ut_result === 'ACC') stats.utAcc++; if (w.ut_result === 'REJ') stats.utRej++ }
                if (w.rt_result) { stats.withRT++; if (w.rt_result === 'ACC') stats.rtAcc++; if (w.rt_result === 'REJ') stats.rtRej++ }
                if (w.irn_no) stats.withIRN++
                if (w.pwht_result) stats.withPWHT++
                stats.totalLength += Number(w.weld_length) || 0
                stats.totalDefect += Number(w.defect_length) || 0
                if (w.is_repair) stats.isRepair++
                stats.byStage[w.stage || 'unknown'] = (stats.byStage[w.stage || 'unknown'] || 0) + 1
            })
            stats.byDrawing = drawings.size
        }
    }

    const pct = (n: number, d: number) => d > 0 ? Math.round(n * 100 / d) : 0
    const overallRepairRate = stats.totalLength > 0 ? (stats.totalDefect / stats.totalLength * 100).toFixed(2) : '0'

    const Card = ({ label, val, sub, color = '#1e40af', bg = '#dbeafe' }: any) => (
        <div style={{ background: bg, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color, marginTop: '2px' }}>{label}</div>
            {sub && <div style={{ fontSize: '0.7rem', color, opacity: 0.7, marginTop: '2px' }}>{sub}</div>}
        </div>
    )

    function StageRow({ stage, count, total }: { stage: string; count: number; total: number }) {
        const p = pct(count, total)
        const colors: Record<string, string> = { completed: '#166534', fitup: '#1e40af', visual: '#7c3aed', backgouge: '#c2410c', lamcheck: '#065f46', mpi: '#854d0e', ut: '#0369a1', pwht: '#0f766e' }
        const color = colors[stage] || '#374151'
        return (
            <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.875rem', color: '#374151', textTransform: 'capitalize' }}>{stage}</span>
                    <span style={{ fontWeight: 600, color }}>{count} ({p}%)</span>
                </div>
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${p}%`, height: '100%', background: color, borderRadius: '3px' }} />
                </div>
            </div>
        )
    }

    return (
        <div className="page-enter">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>📊 Báo cáo Tổng hợp</h1>
            <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.875rem' }}>Tương ứng Sheet <strong>RESULT + tota(lN)</strong> — tất cả số liệu tổng quan dự án</p>

            {!projectId ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>Vui lòng chọn Dự án ở menu bên trái.</div>
            ) : (
                <>
                    {/* Summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                        <Card label="Tổng Mối hàn" val={stats.total.toLocaleString()} color="#1e40af" bg="#dbeafe" />
                        <Card label="Bản vẽ" val={stats.byDrawing} color="#0369a1" bg="#e0f2fe" />
                        <Card label="Tổng độ dài (mm)" val={stats.totalLength.toLocaleString()} color="#374151" bg="#f8fafc" />
                        <Card label="IRN Done" val={stats.withIRN} sub={`${pct(stats.withIRN, stats.total)}%`} color="#166534" bg="#dcfce7" />
                        <Card label="Repair Rate" val={`${overallRepairRate}%`} color={Number(overallRepairRate) < 5 ? '#166534' : '#991b1b'} bg={Number(overallRepairRate) < 5 ? '#dcfce7' : '#fee2e2'} />
                        <Card label="Phải sửa" val={stats.isRepair} color="#dc2626" bg="#fee2e2" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        {/* Process progress */}
                        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                            <h3 style={{ fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>📍 Tiến độ từng giai đoạn</h3>
                            {[
                                { label: 'Fit-Up', count: stats.withFitup },
                                { label: 'Visual', count: stats.withVisual },
                                { label: 'Backgouge', count: stats.withBG },
                                { label: 'Lamcheck', count: stats.withLC },
                                { label: 'MT/MPI', count: stats.withMT },
                                { label: 'UT', count: stats.withUT },
                                { label: 'RT', count: stats.withRT },
                                { label: 'PWHT', count: stats.withPWHT },
                                { label: 'IRN', count: stats.withIRN },
                            ].map(({ label, count }) => {
                                const p = pct(count, stats.total)
                                return (
                                    <div key={label} style={{ marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                            <span style={{ fontSize: '0.85rem' }}>{label}</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e40af' }}>{count.toLocaleString()} ({p}%)</span>
                                        </div>
                                        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: `${p}%`, height: '100%', background: '#3b82f6', borderRadius: '3px' }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* NDT Results */}
                        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                            <h3 style={{ fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>🔬 Kết quả NDT</h3>
                            {[
                                { type: 'MT', total: stats.withMT, acc: stats.mtAcc, rej: stats.mtRej },
                                { type: 'UT', total: stats.withUT, acc: stats.utAcc, rej: stats.utRej },
                                { type: 'RT', total: stats.withRT, acc: stats.rtAcc, rej: stats.rtRej },
                            ].map(({ type, total: t, acc, rej }) => (
                                <div key={type} style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                                    <div style={{ fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>{type} — {t} mối</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div style={{ textAlign: 'center', background: '#dcfce7', borderRadius: '6px', padding: '8px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#166534' }}>{acc}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>ACCEPTED</div>
                                        </div>
                                        <div style={{ textAlign: 'center', background: '#fee2e2', borderRadius: '6px', padding: '8px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#991b1b' }}>{rej}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#991b1b', fontWeight: 600 }}>REJECTED</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div style={{ marginTop: '12px' }}>
                                <h4 style={{ fontWeight: 700, marginBottom: '12px', color: '#0f172a' }}>📍 Stage Breakdown</h4>
                                {Object.entries(stats.byStage).sort((a, b) => b[1] - a[1]).map(([stage, count]) => (
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
