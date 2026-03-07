// app/(dashboard)/drawings/page.tsx — list WMap sheet equivalent
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

function s(v: unknown) { return v != null && v !== '' ? String(v) : '—' }

export default async function DrawingsPage() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const projectId = cookieStore.get('weld-control-project-id')?.value || null

    // Group welds by drawing_no to get drawing stats
    let drawings: { drawing_no: string; total: number; fitup: number; visual: number; ndt: number; irn: number; goc_code: string }[] = []

    if (projectId) {
        const { data } = await (supabase.from('welds') as any)
            .select('drawing_no, goc_code, fitup_date, visual_date, mt_result, ut_result, rt_result, irn_no')
            .eq('project_id', projectId)
            .order('drawing_no', { ascending: true })

        if (data) {
            const map: Record<string, any> = {}
            data.forEach((w: any) => {
                const key = w.drawing_no || '(Chưa có Drawing)'
                if (!map[key]) map[key] = { drawing_no: key, total: 0, fitup: 0, visual: 0, ndt: 0, irn: 0, goc_code: w.goc_code || '' }
                map[key].total++
                if (w.fitup_date) map[key].fitup++
                if (w.visual_date) map[key].visual++
                if (w.mt_result || w.ut_result || w.rt_result) map[key].ndt++
                if (w.irn_no) map[key].irn++
            })
            drawings = Object.values(map).sort((a, b) => a.drawing_no.localeCompare(b.drawing_no))
        }
    }

    const totalDrawings = drawings.length
    const totalWelds = drawings.reduce((s, d) => s + d.total, 0)

    const thStyle = { padding: '10px 14px', fontWeight: 600, color: '#475569', textAlign: 'left' as const, fontSize: '0.75rem', textTransform: 'uppercase' as const, background: '#f8fafc', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' as const }
    const tdStyle = { padding: '10px 14px', fontSize: '0.87rem', borderBottom: '1px solid #f1f5f9' }

    function Pct({ done, total }: { done: number; total: number }) {
        const pct = total > 0 ? Math.round(done * 100 / total) : 0
        const color = pct === 100 ? '#166534' : pct >= 50 ? '#0369a1' : '#92400e'
        const bg = pct === 100 ? '#dcfce7' : pct >= 50 ? '#dbeafe' : '#fef9c3'
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color }}>{done}/{total}</span>
                    <span style={{ fontSize: '0.7rem', color }}>{pct}%</span>
                </div>
                <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px' }} />
                </div>
            </div>
        )
    }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>🗺️ Bản vẽ (Drawing Map)</h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem' }}>
                    Tương ứng Sheet <strong>list WMap</strong> — {projectId ? `${totalDrawings} bản vẽ | ${totalWelds.toLocaleString()} mối hàn` : 'Chọn dự án để xem'}
                </p>
            </div>

            {!projectId ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>Vui lòng chọn Dự án ở menu bên trái.</div>
            ) : drawings.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🗺️</div>
                    Chưa có dữ liệu bản vẽ. Hãy import file Excel trước.
                </div>
            ) : (
                <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>#</th>
                                <th style={thStyle}>Drawing No</th>
                                <th style={thStyle}>GOC Code</th>
                                <th style={thStyle}>Total Welds</th>
                                <th style={thStyle}>Fit-Up</th>
                                <th style={thStyle}>Visual</th>
                                <th style={thStyle}>NDT Done</th>
                                <th style={thStyle}>IRN Done</th>
                                <th style={thStyle}>Xem mối hàn</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drawings.map((d, i) => (
                                <tr key={d.drawing_no} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                    <td style={{ ...tdStyle, color: '#94a3b8', fontSize: '0.75rem' }}>{i + 1}</td>
                                    <td style={{ ...tdStyle, fontWeight: 700, fontFamily: 'monospace', color: '#1e40af' }}>{s(d.drawing_no)}</td>
                                    <td style={{ ...tdStyle, color: '#64748b' }}>{s(d.goc_code)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'center' as const }}>{d.total}</td>
                                    <td style={{ ...tdStyle, minWidth: '120px' }}><Pct done={d.fitup} total={d.total} /></td>
                                    <td style={{ ...tdStyle, minWidth: '120px' }}><Pct done={d.visual} total={d.total} /></td>
                                    <td style={{ ...tdStyle, minWidth: '120px' }}><Pct done={d.ndt} total={d.total} /></td>
                                    <td style={{ ...tdStyle, minWidth: '120px' }}><Pct done={d.irn} total={d.total} /></td>
                                    <td style={tdStyle}>
                                        <a href={`/welds?drawing=${encodeURIComponent(d.drawing_no)}`}
                                            style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 500, padding: '4px 10px', background: '#eff6ff', borderRadius: '6px' }}>
                                            Xem →
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
