// app/(dashboard)/inspections/ndt/page.tsx — MPI/NDT sheet equivalent
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function fmt(v: unknown) { return v != null && v !== '' ? String(v).slice(0, 10) : '—' }
function s(v: unknown) { return v != null && v !== '' ? String(v) : '—' }

function Result({ v }: { v: unknown }) {
    const val = v != null && v !== '' ? String(v) : null
    if (!val) return <span style={{ color: '#94a3b8' }}>—</span>
    const ok = val === 'ACC', rej = val === 'REJ'
    return <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.7rem', background: ok ? '#dcfce7' : rej ? '#fee2e2' : '#f1f5f9', color: ok ? '#166534' : rej ? '#991b1b' : '#64748b' }}>{val}</span>
}

export default async function NDTPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const projectId = cookieStore.get('weld-control-project-id')?.value || null

    const searchParams = await props.searchParams
    const page = parseInt(searchParams?.page || '0', 10)
    const limit = 100
    const offset = page * limit

    let welds: any[] = []
    let total = 0, mtAcc = 0, mtRej = 0, utAcc = 0, utRej = 0, rtAcc = 0, rtRej = 0

    if (projectId) {
        // 1. Fetch Paginated Table Data
        const { data, count } = await (supabase.from('welds') as any)
            .select('id, weld_id, drawing_no, weld_no, joint_type, ndt_requirements, weld_length, mt_result, mt_report_no, ut_result, ut_report_no, rt_result, rt_report_no, pwht_result, irn_no, irn_date, defect_length, repair_length, welders, stage', { count: 'exact' })
            .eq('project_id', projectId)
            .or('mt_result.not.is.null,ut_result.not.is.null,rt_result.not.is.null')
            .order('excel_row_order', { ascending: true })
            .range(offset, offset + limit - 1)

        welds = data || []
        total = count || 0

        // 2. Fetch Lightweight Summary Stats for all pages
        const { data: statsData } = await (supabase.from('welds') as any)
            .select('mt_result, ut_result, rt_result')
            .eq('project_id', projectId)
            .or('mt_result.not.is.null,ut_result.not.is.null,rt_result.not.is.null')

        if (statsData) {
            statsData.forEach((w: any) => {
                if (w.mt_result === 'ACC') mtAcc++; if (w.mt_result === 'REJ') mtRej++
                if (w.ut_result === 'ACC') utAcc++; if (w.ut_result === 'REJ') utRej++
                if (w.rt_result === 'ACC') rtAcc++; if (w.rt_result === 'REJ') rtRej++
            })
        }
    }

    const totalPages = Math.ceil(total / limit)

    const thStyle = { padding: '8px 12px', fontWeight: 600, color: '#475569', textAlign: 'left' as const, fontSize: '0.75rem', textTransform: 'uppercase' as const, background: '#f8fafc', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' as const }
    const tdStyle = { padding: '8px 12px', fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9', color: '#374151' }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>🔬 Kết quả NDT (MPI)</h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem' }}>Tương ứng Sheet <strong>MPI</strong> — {projectId ? `${total.toLocaleString()} mối hàn có kết quả NDT` : 'Chọn dự án để xem'}</p>
            </div>

            {projectId && total > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '10px', marginBottom: '20px' }}>
                    {[
                        { label: 'MT ACC', val: mtAcc, bg: '#dcfce7', color: '#166534' },
                        { label: 'MT REJ', val: mtRej, bg: '#fee2e2', color: '#991b1b' },
                        { label: 'UT ACC', val: utAcc, bg: '#dcfce7', color: '#166534' },
                        { label: 'UT REJ', val: utRej, bg: '#fee2e2', color: '#991b1b' },
                        { label: 'RT ACC', val: rtAcc, bg: '#dcfce7', color: '#166534' },
                        { label: 'RT REJ', val: rtRej, bg: '#fee2e2', color: '#991b1b' },
                    ].map(c => (
                        <div key={c.label} style={{ background: c.bg, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: c.color }}>{c.val}</div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.color, marginTop: '2px' }}>{c.label}</div>
                        </div>
                    ))}
                </div>
            )}

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
                                <th style={thStyle}>NDT Req</th>
                                <th style={thStyle}>MT</th>
                                <th style={thStyle}>MT Report</th>
                                <th style={thStyle}>UT</th>
                                <th style={thStyle}>UT Report</th>
                                <th style={thStyle}>RT</th>
                                <th style={thStyle}>RT Report</th>
                                <th style={thStyle}>PWHT</th>
                                <th style={thStyle}>IRN No</th>
                                <th style={thStyle}>IRN Date</th>
                                <th style={thStyle}>Defect(mm)</th>
                                <th style={thStyle}>Repair(mm)</th>
                                <th style={thStyle}>Welders</th>
                            </tr>
                        </thead>
                        <tbody>
                            {welds.length === 0 ? (
                                <tr><td colSpan={18} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có mối hàn nào có kết quả NDT</td></tr>
                            ) : welds.map((w, i) => (
                                <tr key={w.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                    <td style={{ ...tdStyle, color: '#94a3b8' }}>{i + 1}</td>
                                    <td style={tdStyle}><Link href={`/welds/${w.id}`} style={{ color: '#854d0e', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem', textDecoration: 'none' }}>{s(w.weld_id)}</Link></td>
                                    <td style={tdStyle}>{s(w.drawing_no)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{s(w.weld_no)}</td>
                                    <td style={tdStyle}>{s(w.joint_type)}</td>
                                    <td style={tdStyle}>{s(w.ndt_requirements)}</td>
                                    <td style={tdStyle}><Result v={w.mt_result} /></td>
                                    <td style={tdStyle}>{s(w.mt_report_no)}</td>
                                    <td style={tdStyle}><Result v={w.ut_result} /></td>
                                    <td style={tdStyle}>{s(w.ut_report_no)}</td>
                                    <td style={tdStyle}><Result v={w.rt_result} /></td>
                                    <td style={tdStyle}>{s(w.rt_report_no)}</td>
                                    <td style={tdStyle}><Result v={w.pwht_result} /></td>
                                    <td style={{ ...tdStyle, fontWeight: 700, color: '#0369a1' }}>{s(w.irn_no)}</td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmt(w.irn_date)}</td>
                                    <td style={tdStyle}>{w.defect_length != null ? `${w.defect_length}` : '—'}</td>
                                    <td style={tdStyle}>{w.repair_length != null ? `${w.repair_length}` : '—'}</td>
                                    <td style={tdStyle}>{s(w.welders)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Trang {page + 1}/{totalPages} — Khớp {total} mối hàn
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {page > 0 && (
                            <Link href={`?page=${page - 1}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                                ‹ Trước
                            </Link>
                        )}
                        {page < totalPages - 1 && (
                            <Link href={`?page=${page + 1}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                                Sau ›
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
