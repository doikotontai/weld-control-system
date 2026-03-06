// app/(dashboard)/inspections/backgouge/page.tsx — BACKGOUGE sheet equivalent
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function fmt(v: unknown) { return v != null && v !== '' ? String(v).slice(0, 10) : '—' }
function s(v: unknown) { return v != null && v !== '' ? String(v) : '—' }

export default async function BackgougePage() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const projectId = cookieStore.get('weld-control-project-id')?.value || null

    let welds: any[] = []
    let total = 0

    if (projectId) {
        const { data, count } = await (supabase.from('welds') as any)
            .select('id, weld_id, drawing_no, weld_no, joint_type, weld_length, goc_code, backgouge_date, backgouge_request_no, welders, visual_date, stage', { count: 'exact' })
            .eq('project_id', projectId)
            .not('backgouge_date', 'is', null)
            .order('excel_row_order', { ascending: true })

        welds = data || []
        total = count || 0
    }

    const thStyle = { padding: '8px 12px', fontWeight: 600, color: '#475569', textAlign: 'left' as const, fontSize: '0.75rem', textTransform: 'uppercase' as const, background: '#f8fafc', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' as const }
    const tdStyle = { padding: '8px 12px', fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9', color: '#374151' }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>⚙️ Backgouge</h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem' }}>
                    Tương ứng Sheet <strong>BACKGOUGE</strong> — {projectId ? `${total.toLocaleString()} mối hàn đã Backgouge` : 'Chọn dự án để xem'}
                </p>
            </div>

            {!projectId ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>Vui lòng chọn Dự án ở menu bên trái.</div>
            ) : (
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>#</th>
                                <th style={thStyle}>Weld ID</th>
                                <th style={thStyle}>DrawingNo</th>
                                <th style={thStyle}>Weld No</th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Length</th>
                                <th style={thStyle}>GOC Code</th>
                                <th style={thStyle}>BG Date</th>
                                <th style={thStyle}>BG Request No</th>
                                <th style={thStyle}>VS Date</th>
                                <th style={thStyle}>Welders</th>
                                <th style={thStyle}>Stage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {welds.length === 0 ? (
                                <tr><td colSpan={12} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có mối hàn nào có dữ liệu Backgouge</td></tr>
                            ) : welds.map((w, i) => (
                                <tr key={w.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                    <td style={{ ...tdStyle, color: '#94a3b8' }}>{i + 1}</td>
                                    <td style={tdStyle}><Link href={`/welds/${w.id}`} style={{ color: '#c2410c', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem', textDecoration: 'none' }}>{s(w.weld_id)}</Link></td>
                                    <td style={tdStyle}>{s(w.drawing_no)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{s(w.weld_no)}</td>
                                    <td style={tdStyle}>{s(w.joint_type)}</td>
                                    <td style={tdStyle}>{w.weld_length != null ? `${w.weld_length}mm` : '—'}</td>
                                    <td style={tdStyle}>{s(w.goc_code)}</td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmt(w.backgouge_date)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: '#c2410c' }}>{s(w.backgouge_request_no)}</td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmt(w.visual_date)}</td>
                                    <td style={tdStyle}>{s(w.welders)}</td>
                                    <td style={tdStyle}><span style={{ padding: '2px 7px', borderRadius: '4px', background: '#ffedd5', color: '#c2410c', fontWeight: 600, fontSize: '0.7rem' }}>{s(w.stage)}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
