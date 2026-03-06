'use client'
// app/(dashboard)/welds/[id]/page.tsx — Chi tiết mối hàn
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'

function str(v: unknown): string | null {
    if (v == null || v === '') return null
    return String(v)
}

function fmtDate(v: unknown): string | null {
    if (!v) return null
    const s = String(v).slice(0, 10)
    return s || null
}

function Field({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) {
    const display = value != null && value !== '' ? value : '—'
    return (
        <div style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: highlight ? 700 : 400, color: highlight ? '#0f172a' : '#374151' }}>{display}</div>
        </div>
    )
}

function ResultBadge({ v }: { v: string | null | undefined }) {
    if (!v) return <span style={{ color: '#94a3b8' }}>—</span>
    const ok = v === 'ACC', rej = v === 'REJ'
    return <span style={{ padding: '2px 10px', borderRadius: '4px', fontWeight: 700, background: ok ? '#dcfce7' : rej ? '#fee2e2' : '#f1f5f9', color: ok ? '#166534' : rej ? '#991b1b' : '#64748b' }}>{v}</span>
}

export default function WeldDetailPage() {
    const supabase = createClient()
    const params = useParams()
    const id = params.id as string
    const [weld, setWeld] = useState<Record<string, unknown> | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function load() {
            const { data, error: err } = await (supabase.from('welds') as any).select('*').eq('id', id).single()
            if (err || !data) { setError('Không tìm thấy mối hàn'); setLoading(false); return }
            setWeld(data as Record<string, unknown>)
            setLoading(false)
        }
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '80px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#64748b' }}>Đang tải...</p>
        </div>
    )

    if (error || !weld) return (
        <div style={{ padding: '40px', color: '#dc2626' }}>
            {error || 'Không tìm thấy'} <Link href="/welds">← Quay lại</Link>
        </div>
    )

    const STAGE_COLORS: Record<string, string> = {
        FINAL: '#166534', IRN: '#0369a1', NDT: '#7c3aed',
        VISUAL: '#b45309', BACKGOUGE: '#c2410c', FITUP: '#0891b2', PLANNED: '#94a3b8',
    }
    const stageStr = str(weld.stage)
    const stageColor = (stageStr && STAGE_COLORS[stageStr]) || '#64748b'

    return (
        <div className="page-enter">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{str(weld.weld_id) || ''}</h1>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {stageStr && (
                            <span style={{ padding: '3px 10px', borderRadius: '5px', fontWeight: 700, fontSize: '0.8rem', background: stageColor + '22', color: stageColor }}>
                                {stageStr}
                            </span>
                        )}
                        {!!weld.is_repair && (
                            <span style={{ padding: '3px 10px', borderRadius: '5px', fontWeight: 700, fontSize: '0.8rem', background: '#fef9c3', color: '#854d0e' }}>
                                🔁 Repair
                            </span>
                        )}
                    </div>
                </div>
                <Link href={`/welds/${id}/edit`} className="btn btn-primary">✏️ Chỉnh sửa</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {/* Basic Info */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '12px', color: '#1e40af' }}>📋 Thông tin cơ bản</h3>
                    <Field label="DrawingNo" value={str(weld.drawing_no)} />
                    <Field label="Weld No" value={str(weld.weld_no)} />
                    <Field label="Weld Joints" value={str(weld.joint_family)} />
                    <Field label="Weld Type" value={str(weld.joint_type)} />
                    <Field label="NDT" value={str(weld.ndt_requirements)} />
                    <Field label="OD /L" value={str(weld.position)} />
                    <Field label="Length (mm)" value={str(weld.weld_length)} />
                    <Field label="Thick (mm)" value={str(weld.thickness)} />
                    <Field label="Thick LC" value={str(weld.thickness_lamcheck)} />
                    <Field label="WPS No." value={str(weld.wps_no)} />
                    <Field label="GOC Code" value={str(weld.goc_code)} />
                    <Field label="Welders' ID" value={str(weld.welders)} />
                </div>

                {/* Inspection */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '12px', color: '#1e40af' }}>🔧 Kiểm tra / Inspection</h3>
                    <Field label="FU Inspector" value={str(weld.fitup_inspector)} />
                    <Field label="FU Date" value={fmtDate(weld.fitup_date)} />
                    <Field label="FU Request" value={str(weld.fitup_request_no)} />
                    <Field label="FU Finish" value={fmtDate(weld.fitup_accepted_date)} />
                    <Field label="VS Inspector" value={str(weld.visual_inspector)} />
                    <Field label="VS Date" value={fmtDate(weld.visual_date)} />
                    <Field label="VS Request" value={str(weld.visual_request_no)} />
                    <Field label="BG Date" value={fmtDate(weld.backgouge_date)} />
                    <Field label="BG Request" value={str(weld.backgouge_request_no)} />
                </div>

                {/* NDT Results */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '12px', color: '#1e40af' }}>🔬 Kết quả NDT</h3>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>MT</div><ResultBadge v={str(weld.mt_result)} /></div>
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>UT</div><ResultBadge v={str(weld.ut_result)} /></div>
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>RT</div><ResultBadge v={str(weld.rt_result)} /></div>
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>PWHT</div><ResultBadge v={str(weld.pwht_result)} /></div>
                    </div>
                    <Field label="MT Report" value={str(weld.mt_report_no)} />
                    <Field label="UT Report" value={str(weld.ut_report_no)} />
                    <Field label="RT Report" value={str(weld.rt_report_no)} />
                    <Field label="IRN No" value={str(weld.irn_no)} highlight />
                    <Field label="IRN Date" value={fmtDate(weld.irn_date)} />
                    <Field label="Defect Length" value={weld.defect_length != null ? `${weld.defect_length} mm` : null} />
                    <Field label="Repair Length" value={weld.repair_length != null ? `${weld.repair_length} mm` : null} />
                    {str(weld.remarks) && <Field label="Remarks" value={str(weld.remarks)} />}
                </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                <Link href="/welds" className="btn btn-secondary">← Danh sách</Link>
                <Link href={`/welds/${id}/edit`} className="btn btn-primary">✏️ Chỉnh sửa</Link>
            </div>
        </div>
    )
}
