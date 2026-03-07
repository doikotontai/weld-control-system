// app/(dashboard)/reports/repair-rate/page.tsx — DULIEU sheet equivalent
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function RepairRatePage() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const projectId = cookieStore.get('weld-control-project-id')?.value || null

    let welderStats: any[] = []
    let totalWelds = 0, totalLength = 0, totalDefect = 0

    if (projectId) {
        const { data } = await (supabase.from('welds') as any)
            .select('welders, weld_length, defect_length, repair_length, is_repair, mt_result, ut_result')
            .eq('project_id', projectId)

        if (data) {
            totalWelds = data.length
            data.forEach((w: any) => {
                totalLength += Number(w.weld_length) || 0
                totalDefect += Number(w.defect_length) || 0
            })

            const map: Record<string, any> = {}
            data.forEach((w: any) => {
                const welderList = (w.welders || '').split(/[;,\/]/).map((x: string) => x.trim()).filter(Boolean)
                if (welderList.length === 0) welderList.push('(Chưa rõ)')
                welderList.forEach((welder: string) => {
                    if (!map[welder]) map[welder] = { welder, total: 0, length: 0, defect: 0, repair: 0, mtRej: 0, utRej: 0 }
                    const m = map[welder]
                    m.total++
                    m.length += Number(w.weld_length) || 0
                    m.defect += Number(w.defect_length) || 0
                    m.repair += Number(w.repair_length) || 0
                    if (w.mt_result === 'REJ') m.mtRej++
                    if (w.ut_result === 'REJ') m.utRej++
                })
            })

            welderStats = Object.values(map).map((m: any) => ({
                ...m,
                repairRate: m.length > 0 ? Math.round(m.defect * 100 / m.length * 100) / 100 : 0,
            })).sort((a, b) => b.repairRate - a.repairRate)
        }
    }

    const overallRate = totalLength > 0 ? (totalDefect / totalLength * 100).toFixed(2) : '0'

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>📈 Tỷ lệ Repair theo Thợ hàn</h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem' }}>Tương ứng Sheet <strong>DULIEU</strong> — leaderboard thợ hàn theo repair rate</p>
            </div>

            {projectId && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
                    {[
                        { label: 'Tổng mối hàn', val: totalWelds.toLocaleString(), color: '#1e40af', bg: '#dbeafe' },
                        { label: 'Tổng độ dài (mm)', val: totalLength.toLocaleString(), color: '#0369a1', bg: '#e0f2fe' },
                        { label: 'Tổng lỗi (mm)', val: totalDefect > 0 ? totalDefect.toFixed(0) : '0', color: '#dc2626', bg: '#fee2e2' },
                        { label: 'Repair Rate tổng', val: `${overallRate}%`, color: Number(overallRate) < 5 ? '#166534' : Number(overallRate) < 10 ? '#92400e' : '#991b1b', bg: Number(overallRate) < 5 ? '#dcfce7' : Number(overallRate) < 10 ? '#fef9c3' : '#fee2e2' },
                    ].map(c => (
                        <div key={c.label} style={{ background: c.bg, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: c.color }}>{c.val}</div>
                            <div style={{ fontSize: '0.75rem', color: c.color, marginTop: '4px', fontWeight: 600 }}>{c.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {!projectId ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>Vui lòng chọn Dự án.</div>
            ) : (
                <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                {['Xếp hạng', 'Welder ID', 'Tổng Mối', 'Độ dài (mm)', 'Lỗi (mm)', 'Repair Rate', 'MT REJ', 'UT REJ'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', fontWeight: 600, color: '#475569', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {welderStats.map((w, i) => {
                                const rr = w.repairRate
                                const rrColor = rr === 0 ? '#166534' : rr < 5 ? '#0369a1' : rr < 10 ? '#92400e' : '#991b1b'
                                const rrBg = rr === 0 ? '#dcfce7' : rr < 5 ? '#dbeafe' : rr < 10 ? '#fef9c3' : '#fee2e2'
                                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
                                return (
                                    <tr key={w.welder} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                        <td style={{ padding: '10px 14px', fontSize: '1rem', textAlign: 'center' }}>{medal}</td>
                                        <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace', color: '#1e40af', fontSize: '0.875rem' }}>{w.welder}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{w.total}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#374151' }}>{w.length.toLocaleString()}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right', color: w.defect > 0 ? '#dc2626' : '#64748b', fontWeight: w.defect > 0 ? 600 : 400 }}>{w.defect > 0 ? w.defect.toFixed(0) : '—'}</td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ padding: '3px 10px', borderRadius: '6px', background: rrBg, color: rrColor, fontWeight: 700, fontSize: '0.85rem' }}>{rr.toFixed(2)}%</span>
                                                <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                                                    <div style={{ width: `${Math.min(rr * 5, 100)}%`, height: '100%', background: rrColor, borderRadius: '3px' }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 14px', textAlign: 'center', color: w.mtRej > 0 ? '#dc2626' : '#94a3b8', fontWeight: w.mtRej > 0 ? 700 : 400 }}>{w.mtRej || '—'}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'center', color: w.utRej > 0 ? '#dc2626' : '#94a3b8', fontWeight: w.utRej > 0 ? 700 : 400 }}>{w.utRej || '—'}</td>
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
