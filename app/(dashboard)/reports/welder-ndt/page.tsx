// app/(dashboard)/reports/welder-ndt/page.tsx — KQ HAN(IN) sheet equivalent
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function WelderNDTPage() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const projectId = cookieStore.get('weld-control-project-id')?.value || null

    // Pull all welds with welder info — compute stats per welder
    let welderStats: {
        welder: string
        total: number
        length: number
        defect: number
        repairRate: number
        mtAcc: number; mtRej: number
        utAcc: number; utRej: number
        rtAcc: number; rtRej: number
        irnDone: number
    }[] = []

    if (projectId) {
        const { data } = await (supabase.from('welds') as any)
            .select('welders, weld_length, defect_length, mt_result, ut_result, rt_result, irn_no')
            .eq('project_id', projectId)

        if (data) {
            const map: Record<string, any> = {}
            data.forEach((w: any) => {
                // Welder field may have 1 or 2 welders separated by / or ;
                const welderList = (w.welders || '').split(/[;,\/]/).map((x: string) => x.trim()).filter(Boolean)
                if (welderList.length === 0) welderList.push('(Chưa rõ)')

                welderList.forEach((welder: string) => {
                    if (!map[welder]) map[welder] = { welder, total: 0, length: 0, defect: 0, mtAcc: 0, mtRej: 0, utAcc: 0, utRej: 0, rtAcc: 0, rtRej: 0, irnDone: 0 }
                    const m = map[welder]
                    m.total++
                    m.length += (Number(w.weld_length) || 0)
                    m.defect += (Number(w.defect_length) || 0)
                    if (w.mt_result === 'ACC') m.mtAcc++; if (w.mt_result === 'REJ') m.mtRej++
                    if (w.ut_result === 'ACC') m.utAcc++; if (w.ut_result === 'REJ') m.utRej++
                    if (w.rt_result === 'ACC') m.rtAcc++; if (w.rt_result === 'REJ') m.rtRej++
                    if (w.irn_no) m.irnDone++
                })
            })

            welderStats = Object.values(map).map((m: any) => ({
                ...m,
                repairRate: m.length > 0 ? Math.round(m.defect * 100 / m.length * 100) / 100 : 0,
            })).sort((a, b) => b.repairRate - a.repairRate)
        }
    }

    const thStyle = { padding: '10px 14px', fontWeight: 600, color: '#475569', textAlign: 'left' as const, fontSize: '0.75rem', textTransform: 'uppercase' as const, background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }
    const tdStyle = { padding: '10px 14px', fontSize: '0.85rem', borderBottom: '1px solid #f1f5f9' }

    function RateBadge({ rate }: { rate: number }) {
        const color = rate === 0 ? '#166534' : rate < 5 ? '#0369a1' : rate < 10 ? '#92400e' : '#991b1b'
        const bg = rate === 0 ? '#dcfce7' : rate < 5 ? '#dbeafe' : rate < 10 ? '#fef9c3' : '#fee2e2'
        return <span style={{ padding: '3px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', background: bg, color }}>{rate.toFixed(2)}%</span>
    }

    function RS({ acc, rej }: { acc: number; rej: number }) {
        if (acc + rej === 0) return <span style={{ color: '#94a3b8' }}>—</span>
        return <span>{acc > 0 && <span style={{ color: '#166534', fontWeight: 600 }}>{acc}✓</span>}{' '}{rej > 0 && <span style={{ color: '#991b1b', fontWeight: 600 }}>{rej}✗</span>}</span>
    }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>👷 NDT theo Thợ hàn</h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem' }}>Tương ứng Sheet <strong>KQ HAN(IN)</strong> — {welderStats.length} thợ hàn | Sắp xếp theo Repair Rate giảm dần</p>
            </div>

            {!projectId ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>Vui lòng chọn Dự án ở menu bên trái.</div>
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
                                <th style={thStyle}>IRN Done</th>
                            </tr>
                        </thead>
                        <tbody>
                            {welderStats.length === 0 ? (
                                <tr><td colSpan={10} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Không có dữ liệu</td></tr>
                            ) : welderStats.map((w, i) => (
                                <tr key={w.welder} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                    <td style={{ ...tdStyle, color: '#94a3b8' }}>{i + 1}</td>
                                    <td style={{ ...tdStyle, fontWeight: 700, fontFamily: 'monospace', color: '#1e40af' }}>{w.welder}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600, textAlign: 'center' as const }}>{w.total}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' as const }}>{w.length.toLocaleString()}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' as const, color: w.defect > 0 ? '#dc2626' : '#374151' }}>{w.defect > 0 ? w.defect.toFixed(0) : '—'}</td>
                                    <td style={tdStyle}><RateBadge rate={w.repairRate} /></td>
                                    <td style={tdStyle}><RS acc={w.mtAcc} rej={w.mtRej} /></td>
                                    <td style={tdStyle}><RS acc={w.utAcc} rej={w.utRej} /></td>
                                    <td style={tdStyle}><RS acc={w.rtAcc} rej={w.rtRej} /></td>
                                    <td style={{ ...tdStyle, textAlign: 'center' as const, fontWeight: 600, color: '#0369a1' }}>{w.irnDone || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
