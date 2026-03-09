'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STAGE_LABELS } from '@/types'

interface WeldRecord {
    weld_id: string | null
    stage: string | null
    is_repair: boolean | null
    drawing_no: string | null
    weld_no: string | null
    joint_family: string | null
    joint_type: string | null
    ndt_requirements: string | null
    position: string | null
    weld_length: number | null
    thickness: number | null
    thickness_lamcheck: number | null
    wps_no: string | null
    goc_code: string | null
    welders: string | null
    fitup_inspector: string | null
    fitup_date: string | null
    fitup_request_no: string | null
    weld_finish_date: string | null
    visual_inspector: string | null
    visual_date: string | null
    inspection_request_no: string | null
    backgouge_date: string | null
    backgouge_request_no: string | null
    mt_result: string | null
    ut_result: string | null
    rt_result: string | null
    pwht_result: string | null
    mt_report_no: string | null
    ut_report_no: string | null
    rt_report_no: string | null
    ndt_after_pwht: string | null
    release_final_date: string | null
    release_final_request_no: string | null
    release_note_no: string | null
    release_note_date: string | null
    defect_length: number | null
    repair_length: number | null
    cut_off: string | null
    note: string | null
    contractor_issue: string | null
    transmittal_no: string | null
    mw1_no: string | null
    remarks: string | null
}

function displayText(value: unknown): string | null {
    if (value == null || value === '') {
        return null
    }

    return String(value)
}

function formatDate(value: unknown): string | null {
    if (!value) {
        return null
    }

    return String(value).slice(0, 10) || null
}

function Field({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) {
    const displayValue = value != null && value !== '' ? value : '-'

    return (
        <div style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                {label}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: highlight ? 700 : 400, color: highlight ? '#0f172a' : '#374151' }}>{displayValue}</div>
        </div>
    )
}

function ResultBadge({ value }: { value: string | null | undefined }) {
    if (!value) {
        return <span style={{ color: '#94a3b8' }}>-</span>
    }

    const accepted = value === 'ACC'
    const rejected = value === 'REJ'

    return (
        <span
            style={{
                padding: '2px 10px',
                borderRadius: '4px',
                fontWeight: 700,
                background: accepted ? '#dcfce7' : rejected ? '#fee2e2' : '#f1f5f9',
                color: accepted ? '#166534' : rejected ? '#991b1b' : '#64748b',
            }}
        >
            {value}
        </span>
    )
}

export default function WeldDetailPage() {
    const supabase = createClient()
    const params = useParams()
    const id = params.id as string
    const [weld, setWeld] = useState<WeldRecord | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function load() {
            const { data, error: queryError } = await supabase.from('welds').select('*').eq('id', id).single()
            if (queryError || !data) {
                setError('Khong tim thay moi han.')
                setLoading(false)
                return
            }

            setWeld(data as unknown as WeldRecord)
            setLoading(false)
        }

        void load()
    }, [id, supabase])

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '80px' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#64748b' }}>Dang tai...</p>
            </div>
        )
    }

    if (error || !weld) {
        return (
            <div style={{ padding: '40px', color: '#dc2626' }}>
                {error || 'Khong tim thay du lieu.'} <Link href="/welds">Quay lai danh sach</Link>
            </div>
        )
    }

    const stageColors: Record<string, string> = {
        fitup: '#0891b2',
        welding: '#92400e',
        visual: '#b45309',
        backgouge: '#c2410c',
        lamcheck: '#065f46',
        request: '#7c3aed',
        ndt: '#db2777',
        release: '#15803d',
        cutoff: '#475569',
        mw1: '#0891b2',
        rejected: '#b91c1c',
        completed: '#166534',
    }

    const stage = displayText(weld.stage)
    const stageColor = (stage && stageColors[stage]) || '#64748b'

    return (
        <div className="page-enter">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{displayText(weld.weld_id) || ''}</h1>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {stage && (
                            <span style={{ padding: '3px 10px', borderRadius: '5px', fontWeight: 700, fontSize: '0.8rem', background: `${stageColor}22`, color: stageColor }}>
                                {STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || stage}
                            </span>
                        )}
                        {!!weld.is_repair && (
                            <span style={{ padding: '3px 10px', borderRadius: '5px', fontWeight: 700, fontSize: '0.8rem', background: '#fef9c3', color: '#854d0e' }}>
                                Repair
                            </span>
                        )}
                    </div>
                </div>
                <Link href={`/welds/${id}/edit`} className="btn btn-primary">
                    Chinh sua
                </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '12px', color: '#1e40af' }}>Thong tin co ban</h3>
                    <Field label="Drawing No" value={displayText(weld.drawing_no)} />
                    <Field label="Weld No" value={displayText(weld.weld_no)} />
                    <Field label="Weld Joints" value={displayText(weld.joint_family)} />
                    <Field label="Weld Type" value={displayText(weld.joint_type)} />
                    <Field label="NDT" value={displayText(weld.ndt_requirements)} />
                    <Field label="OD / L" value={displayText(weld.position)} />
                    <Field label="Length (mm)" value={displayText(weld.weld_length)} />
                    <Field label="Thickness (mm)" value={displayText(weld.thickness)} />
                    <Field label="Thick LC" value={displayText(weld.thickness_lamcheck)} />
                    <Field label="WPS No." value={displayText(weld.wps_no)} />
                    <Field label="GOC Code" value={displayText(weld.goc_code)} />
                    <Field label="Welder(s)" value={displayText(weld.welders)} />
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '12px', color: '#1e40af' }}>Inspection / Request</h3>
                    <Field label="FU Inspector" value={displayText(weld.fitup_inspector)} />
                    <Field label="FU Date" value={formatDate(weld.fitup_date)} />
                    <Field label="FU Request" value={displayText(weld.fitup_request_no)} />
                    <Field label="Weld Finish Date" value={formatDate(weld.weld_finish_date)} />
                    <Field label="Visual Inspector" value={displayText(weld.visual_inspector)} />
                    <Field label="Visual Date" value={formatDate(weld.visual_date)} />
                    <Field label="NDT / KH Visual RQ" value={displayText(weld.inspection_request_no)} />
                    <Field label="BG Date" value={formatDate(weld.backgouge_date)} />
                    <Field label="BG Request" value={displayText(weld.backgouge_request_no)} />
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '12px', color: '#1e40af' }}>Ket qua NDT / Release</h3>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>MT</div>
                            <ResultBadge value={displayText(weld.mt_result)} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>UT</div>
                            <ResultBadge value={displayText(weld.ut_result)} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>RT</div>
                            <ResultBadge value={displayText(weld.rt_result)} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>PWHT</div>
                            <ResultBadge value={displayText(weld.pwht_result)} />
                        </div>
                    </div>
                    <Field label="MT Report" value={displayText(weld.mt_report_no)} />
                    <Field label="UT Report" value={displayText(weld.ut_report_no)} />
                    <Field label="RT Report" value={displayText(weld.rt_report_no)} />
                    <Field label="NDT after PWHT" value={displayText(weld.ndt_after_pwht)} />
                    <Field label="Release Final Date" value={formatDate(weld.release_final_date)} />
                    <Field label="Release Final RQ" value={displayText(weld.release_final_request_no)} />
                    <Field label="Release Note" value={displayText(weld.release_note_no)} highlight />
                    <Field label="Release Date" value={formatDate(weld.release_note_date)} />
                    <Field label="Defect Length" value={weld.defect_length != null ? `${weld.defect_length} mm` : null} />
                    <Field label="Repair Length" value={weld.repair_length != null ? `${weld.repair_length} mm` : null} />
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '12px', color: '#1e40af' }}>Close-Out / Package</h3>
                    <Field label="Cut Off" value={displayText(weld.cut_off)} />
                    <Field label="MW1" value={displayText(weld.mw1_no)} />
                    <Field label="Transmittal No" value={displayText(weld.transmittal_no)} />
                    <Field label="Contractor Issue" value={displayText(weld.contractor_issue)} />
                    <Field label="Note" value={displayText(weld.note)} />
                    {displayText(weld.remarks) && <Field label="Remarks" value={displayText(weld.remarks)} />}
                </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                <Link href="/welds" className="btn btn-secondary">
                    Danh sach
                </Link>
                <Link href={`/welds/${id}/edit`} className="btn btn-primary">
                    Chinh sua
                </Link>
            </div>
        </div>
    )
}
