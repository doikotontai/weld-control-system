import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function displayText(value: unknown) {
    return value != null && value !== '' ? String(value) : '-'
}

interface DrawingSourceRow {
    drawing_no: string | null
    goc_code: string | null
    fitup_date: string | null
    visual_date: string | null
    mt_result: string | null
    ut_result: string | null
    rt_result: string | null
    release_note_no: string | null
}

interface DrawingSummaryRow {
    drawing_no: string
    total: number
    fitup: number
    visual: number
    ndt: number
    irn: number
    goc_code: string
}

function ProgressCell({ done, total }: { done: number; total: number }) {
    const percentage = total > 0 ? Math.round((done * 100) / total) : 0
    const color = percentage === 100 ? '#166534' : percentage >= 50 ? '#0369a1' : '#92400e'

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color }}>{done}/{total}</span>
                <span style={{ fontSize: '0.7rem', color }}>{percentage}%</span>
            </div>
            <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: '3px' }} />
            </div>
        </div>
    )
}

export default async function DrawingsPage() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const projectId = cookieStore.get('weld-control-project-id')?.value || null

    let drawings: DrawingSummaryRow[] = []

    if (projectId) {
        const { data } = await supabase
            .from('welds')
            .select('drawing_no, goc_code, fitup_date, visual_date, mt_result, ut_result, rt_result, release_note_no')
            .eq('project_id', projectId)
            .order('drawing_no', { ascending: true })

        if (data) {
            const drawingMap: Record<string, DrawingSummaryRow> = {}

            ;(data as DrawingSourceRow[]).forEach((row) => {
                const drawingNo = row.drawing_no || '(Chua co drawing)'
                if (!drawingMap[drawingNo]) {
                    drawingMap[drawingNo] = {
                        drawing_no: drawingNo,
                        total: 0,
                        fitup: 0,
                        visual: 0,
                        ndt: 0,
                        irn: 0,
                        goc_code: row.goc_code || '',
                    }
                }

                drawingMap[drawingNo].total += 1
                if (row.fitup_date) drawingMap[drawingNo].fitup += 1
                if (row.visual_date) drawingMap[drawingNo].visual += 1
                if (row.mt_result || row.ut_result || row.rt_result) drawingMap[drawingNo].ndt += 1
                if (row.release_note_no) drawingMap[drawingNo].irn += 1
            })

            drawings = Object.values(drawingMap).sort((left, right) => left.drawing_no.localeCompare(right.drawing_no))
        }
    }

    const totalDrawings = drawings.length
    const totalWelds = drawings.reduce((sum, drawing) => sum + drawing.total, 0)
    const thStyle = { padding: '10px 14px', fontWeight: 600, color: '#475569', textAlign: 'left' as const, fontSize: '0.75rem', textTransform: 'uppercase' as const, background: '#f8fafc', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' as const }
    const tdStyle = { padding: '10px 14px', fontSize: '0.87rem', borderBottom: '1px solid #f1f5f9' }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Ban ve (Drawing Map)</h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem' }}>
                    Tuong ung sheet <strong>list WMap</strong> - {projectId ? `${totalDrawings} ban ve | ${totalWelds.toLocaleString()} moi han` : 'Chon du an de xem'}
                </p>
            </div>

            {!projectId ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>Vui long chon du an o menu ben trai.</div>
            ) : drawings.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>Map</div>
                    Chua co du lieu ban ve. Hay import file Excel truoc.
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
                                <th style={thStyle}>Release Note</th>
                                <th style={thStyle}>Xem moi han</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drawings.map((drawing, index) => (
                                <tr key={drawing.drawing_no} style={{ background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                                    <td style={{ ...tdStyle, color: '#94a3b8', fontSize: '0.75rem' }}>{index + 1}</td>
                                    <td style={{ ...tdStyle, fontWeight: 700, fontFamily: 'monospace', color: '#1e40af' }}>{displayText(drawing.drawing_no)}</td>
                                    <td style={{ ...tdStyle, color: '#64748b' }}>{displayText(drawing.goc_code)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'center' as const }}>{drawing.total}</td>
                                    <td style={{ ...tdStyle, minWidth: '120px' }}><ProgressCell done={drawing.fitup} total={drawing.total} /></td>
                                    <td style={{ ...tdStyle, minWidth: '120px' }}><ProgressCell done={drawing.visual} total={drawing.total} /></td>
                                    <td style={{ ...tdStyle, minWidth: '120px' }}><ProgressCell done={drawing.ndt} total={drawing.total} /></td>
                                    <td style={{ ...tdStyle, minWidth: '120px' }}><ProgressCell done={drawing.irn} total={drawing.total} /></td>
                                    <td style={tdStyle}>
                                        <Link
                                            href={`/welds?drawing=${encodeURIComponent(drawing.drawing_no)}`}
                                            style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 500, padding: '4px 10px', background: '#eff6ff', borderRadius: '6px' }}
                                        >
                                            {'Xem ->'}
                                        </Link>
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


