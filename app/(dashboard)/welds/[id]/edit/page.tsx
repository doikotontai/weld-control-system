'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STAGE_LABELS } from '@/types'

const NDT_OPTIONS = [
    { value: '', label: '-- ChÆ°a cÃ³ --' },
    { value: 'ACC', label: 'ACC (Cháº¥p nháº­n)' },
    { value: 'REJ', label: 'REJ (Tá»« chá»‘i)' },
    { value: 'N/A', label: 'N/A' },
]

type FormData = Record<string, string>

interface WeldRecord {
    weld_id: string | null
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
    fitup_inspector: string | null
    fitup_date: string | null
    fitup_request_no: string | null
    weld_finish_date: string | null
    welders: string | null
    visual_inspector: string | null
    visual_date: string | null
    inspection_request_no: string | null
    backgouge_date: string | null
    backgouge_request_no: string | null
    mt_result: string | null
    mt_report_no: string | null
    ut_result: string | null
    ut_report_no: string | null
    rt_result: string | null
    rt_report_no: string | null
    lamcheck_date: string | null
    lamcheck_request_no: string | null
    lamcheck_report_no: string | null
    release_final_date: string | null
    release_final_request_no: string | null
    release_note_no: string | null
    release_note_date: string | null
    pwht_result: string | null
    ndt_after_pwht: string | null
    defect_length: number | null
    repair_length: number | null
    cut_off: string | null
    note: string | null
    contractor_issue: string | null
    transmittal_no: string | null
    mw1_no: string | null
    stage: string | null
    remarks: string | null
}

interface WeldUpdateTable {
    update(values: Record<string, string | number | null>): {
        eq(column: 'id', value: string): Promise<{ error: { message: string } | null }>
    }
    delete(): {
        eq(column: 'id', value: string): Promise<{ error: { message: string } | null }>
    }
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label
            style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#64748b',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
            }}
        >
            {children}
            {required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
        </label>
    )
}

function Input(props: {
    value: string
    onChange: (value: string) => void
    type?: string
    placeholder?: string
}) {
    return (
        <input
            type={props.type || 'text'}
            className="form-input"
            value={props.value}
            onChange={(event) => props.onChange(event.target.value)}
            placeholder={props.placeholder}
            style={{ width: '100%', boxSizing: 'border-box' }}
        />
    )
}

function Select(props: {
    value: string
    onChange: (value: string) => void
    children: React.ReactNode
}) {
    return (
        <select
            className="form-input"
            value={props.value}
            onChange={(event) => props.onChange(event.target.value)}
            style={{ width: '100%', boxSizing: 'border-box' }}
        >
            {props.children}
        </select>
    )
}

function SectionCard({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
    return (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3
                style={{
                    fontWeight: 600,
                    marginBottom: '20px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid #f1f5f9',
                    color: '#1e40af',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}
            >
                <span>{emoji}</span>
                <span>{title}</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {children}
            </div>
        </div>
    )
}

export default function EditWeldPage() {
    const supabase = createClient()
    const router = useRouter()
    const params = useParams()
    const id = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [weldDisplayId, setWeldDisplayId] = useState('')

    const emptyForm: FormData = {
        weld_id: '',
        drawing_no: '',
        weld_no: '',
        joint_family: '',
        joint_type: '',
        ndt_requirements: '',
        position: '',
        weld_length: '',
        thickness: '',
        thickness_lamcheck: '',
        wps_no: '',
        goc_code: '',
        fitup_inspector: '',
        fitup_date: '',
        fitup_request_no: '',
        weld_finish_date: '',
        welders: '',
        visual_inspector: '',
        visual_date: '',
        inspection_request_no: '',
        backgouge_date: '',
        backgouge_request_no: '',
        mt_result: '',
        mt_report_no: '',
        ut_result: '',
        ut_report_no: '',
        rt_result: '',
        rt_report_no: '',
        lamcheck_date: '',
        lamcheck_request_no: '',
        lamcheck_report_no: '',
        release_final_date: '',
        release_final_request_no: '',
        release_note_no: '',
        release_note_date: '',
        pwht_result: '',
        ndt_after_pwht: '',
        defect_length: '',
        repair_length: '',
        cut_off: '',
        note: '',
        contractor_issue: '',
        transmittal_no: '',
        mw1_no: '',
        stage: '',
        remarks: '',
    }

    const [form, setForm] = useState<FormData>(emptyForm)
    const setField = (key: string) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

    useEffect(() => {
        async function load() {
            const { data, error: loadError } = await supabase.from('welds').select('*').eq('id', id).single()
            if (loadError || !data) {
                setError('KhÃ´ng tÃ¬m tháº¥y má»‘i hÃ n.')
                setLoading(false)
                return
            }

            const weld = data as unknown as WeldRecord
            const fmtDate = (value: unknown) => (value ? String(value).slice(0, 10) : '')

            setWeldDisplayId(String(weld.weld_id || ''))
            setForm({
                weld_id: String(weld.weld_id || ''),
                drawing_no: String(weld.drawing_no || ''),
                weld_no: String(weld.weld_no || ''),
                joint_family: String(weld.joint_family || ''),
                joint_type: String(weld.joint_type || ''),
                ndt_requirements: String(weld.ndt_requirements || ''),
                position: String(weld.position || ''),
                weld_length: weld.weld_length != null ? String(weld.weld_length) : '',
                thickness: weld.thickness != null ? String(weld.thickness) : '',
                thickness_lamcheck: weld.thickness_lamcheck != null ? String(weld.thickness_lamcheck) : '',
                wps_no: String(weld.wps_no || ''),
                goc_code: String(weld.goc_code || ''),
                fitup_inspector: String(weld.fitup_inspector || ''),
                fitup_date: fmtDate(weld.fitup_date),
                fitup_request_no: String(weld.fitup_request_no || ''),
                weld_finish_date: fmtDate(weld.weld_finish_date),
                welders: String(weld.welders || ''),
                visual_inspector: String(weld.visual_inspector || ''),
                visual_date: fmtDate(weld.visual_date),
                inspection_request_no: String(weld.inspection_request_no || ''),
                backgouge_date: fmtDate(weld.backgouge_date),
                backgouge_request_no: String(weld.backgouge_request_no || ''),
                mt_result: String(weld.mt_result || ''),
                mt_report_no: String(weld.mt_report_no || ''),
                ut_result: String(weld.ut_result || ''),
                ut_report_no: String(weld.ut_report_no || ''),
                rt_result: String(weld.rt_result || ''),
                rt_report_no: String(weld.rt_report_no || ''),
                lamcheck_date: fmtDate(weld.lamcheck_date),
                lamcheck_request_no: String(weld.lamcheck_request_no || ''),
                lamcheck_report_no: String(weld.lamcheck_report_no || ''),
                release_final_date: fmtDate(weld.release_final_date),
                release_final_request_no: String(weld.release_final_request_no || ''),
                release_note_no: String(weld.release_note_no || ''),
                release_note_date: fmtDate(weld.release_note_date),
                pwht_result: String(weld.pwht_result || ''),
                ndt_after_pwht: String(weld.ndt_after_pwht || ''),
                defect_length: weld.defect_length != null ? String(weld.defect_length) : '',
                repair_length: weld.repair_length != null ? String(weld.repair_length) : '',
                cut_off: String(weld.cut_off || ''),
                note: String(weld.note || ''),
                contractor_issue: String(weld.contractor_issue || ''),
                transmittal_no: String(weld.transmittal_no || ''),
                mw1_no: String(weld.mw1_no || ''),
                stage: String(weld.stage || ''),
                remarks: String(weld.remarks || ''),
            })
            setLoading(false)
        }

        void load()
    }, [id, supabase])

    async function handleSave(event: React.FormEvent) {
        event.preventDefault()
        setSaving(true)
        setError('')
        setSuccess('')

        const updateData = {
            weld_id: form.weld_id || null,
            drawing_no: form.drawing_no || null,
            weld_no: form.weld_no || null,
            joint_family: form.joint_family || null,
            joint_type: form.joint_type || null,
            ndt_requirements: form.ndt_requirements || null,
            position: form.position || null,
            weld_length: form.weld_length ? parseFloat(form.weld_length) : null,
            thickness: form.thickness ? parseInt(form.thickness, 10) : null,
            thickness_lamcheck: form.thickness_lamcheck ? parseFloat(form.thickness_lamcheck) : null,
            wps_no: form.wps_no || null,
            goc_code: form.goc_code || null,
            fitup_inspector: form.fitup_inspector || null,
            fitup_date: form.fitup_date || null,
            fitup_request_no: form.fitup_request_no || null,
            weld_finish_date: form.weld_finish_date || null,
            welders: form.welders || null,
            visual_inspector: form.visual_inspector || null,
            visual_date: form.visual_date || null,
            inspection_request_no: form.inspection_request_no || null,
            backgouge_date: form.backgouge_date || null,
            backgouge_request_no: form.backgouge_request_no || null,
            mt_result: form.mt_result || null,
            mt_report_no: form.mt_report_no || null,
            ut_result: form.ut_result || null,
            ut_report_no: form.ut_report_no || null,
            rt_result: form.rt_result || null,
            rt_report_no: form.rt_report_no || null,
            lamcheck_date: form.lamcheck_date || null,
            lamcheck_request_no: form.lamcheck_request_no || null,
            lamcheck_report_no: form.lamcheck_report_no || null,
            release_final_date: form.release_final_date || null,
            release_final_request_no: form.release_final_request_no || null,
            release_note_no: form.release_note_no || null,
            release_note_date: form.release_note_date || null,
            pwht_result: form.pwht_result || null,
            ndt_after_pwht: form.ndt_after_pwht || null,
            defect_length: form.defect_length ? parseFloat(form.defect_length) : null,
            repair_length: form.repair_length ? parseFloat(form.repair_length) : null,
            cut_off: form.cut_off || null,
            note: form.note || null,
            contractor_issue: form.contractor_issue || null,
            transmittal_no: form.transmittal_no || null,
            mw1_no: form.mw1_no || null,
            stage: form.stage || null,
            remarks: form.remarks || null,
        }

        const weldTable = supabase.from('welds') as unknown as WeldUpdateTable
        const { error: updateError } = await weldTable.update(updateData).eq('id', id)

        if (updateError) {
            setError(`Lá»—i lÆ°u: ${updateError.message}`)
        } else {
            setSuccess('âœ… ÄÃ£ lÆ°u thÃ nh cÃ´ng!')
            setTimeout(() => setSuccess(''), 3000)
        }

        setSaving(false)
    }

    async function handleDelete() {
        setDeleting(true)
        const weldTable = supabase.from('welds') as unknown as WeldUpdateTable
        const { error: deleteError } = await weldTable.delete().eq('id', id)

        if (deleteError) {
            setError(`Lá»—i xÃ³a: ${deleteError.message}`)
            setDeleting(false)
            return
        }

        router.push('/welds')
    }

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '80px' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#64748b' }}>Äang táº£i...</p>
            </div>
        )
    }

    return (
        <div className="page-enter">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>âœï¸ Sá»­a má»‘i hÃ n</h1>
                    <p style={{ color: '#64748b', marginTop: '4px', fontFamily: 'monospace', fontSize: '0.95rem' }}>{weldDisplayId}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href="/welds" className="btn btn-secondary">â† Danh sÃ¡ch</Link>
                    {!confirmDelete ? (
                        <button
                            className="btn"
                            onClick={() => setConfirmDelete(true)}
                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                        >
                            ðŸ—‘ï¸ XÃ³a
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.875rem' }}>XÃ¡c nháº­n xÃ³a?</span>
                            <button className="btn" onClick={handleDelete} disabled={deleting} style={{ background: '#dc2626', color: 'white', border: 'none' }}>
                                {deleting ? 'â³' : 'âœ“ XÃ³a'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>âœ• Há»§y</button>
                        </div>
                    )}
                </div>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', marginBottom: '16px' }}>{error}</div>}
            {success && <div style={{ padding: '12px 16px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', marginBottom: '16px' }}>{success}</div>}

            <form onSubmit={handleSave}>
                <SectionCard emoji="ðŸ“‹" title="ThÃ´ng tin cÆ¡ báº£n">
                    <div>
                        <Label>Weld ID</Label>
                        <Input value={form.weld_id} onChange={setField('weld_id')} placeholder="9001-2211-DS-0032-01-WM1" />
                    </div>
                    <div>
                        <Label>Drawing No</Label>
                        <Input value={form.drawing_no} onChange={setField('drawing_no')} placeholder="9001-2211-DS-0032-01-WM" />
                    </div>
                    <div>
                        <Label>Weld No</Label>
                        <Input value={form.weld_no} onChange={setField('weld_no')} placeholder="1 / 17R1 / 127A" />
                    </div>
                    <div>
                        <Label>Weld Joints</Label>
                        <Input value={form.joint_family} onChange={setField('joint_family')} placeholder="X1, X2, X3..." />
                    </div>
                    <div>
                        <Label>Weld Type</Label>
                        <Select value={form.joint_type} onChange={setField('joint_type')}>
                            <option value="">-- Chá»n --</option>
                            {['DB', 'DV', 'SB', 'SV', 'X1', 'X2', 'X3'].map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Label>NDT</Label>
                        <Input value={form.ndt_requirements} onChange={setField('ndt_requirements')} placeholder="100%MT & UT" />
                    </div>
                    <div>
                        <Label>OD / L (Position)</Label>
                        <Input value={form.position} onChange={setField('position')} placeholder="D / L" />
                    </div>
                    <div>
                        <Label>Length (mm)</Label>
                        <Input value={form.weld_length} onChange={setField('weld_length')} type="number" placeholder="2392.68" />
                    </div>
                    <div>
                        <Label>Thickness (mm)</Label>
                        <Input value={form.thickness} onChange={setField('thickness')} type="number" placeholder="25" />
                    </div>
                    <div>
                        <Label>Thick LC</Label>
                        <Input value={form.thickness_lamcheck} onChange={setField('thickness_lamcheck')} type="number" placeholder="25" />
                    </div>
                    <div>
                        <Label>WPS No.</Label>
                        <Input value={form.wps_no} onChange={setField('wps_no')} placeholder="WPS-TNHA-S06" />
                    </div>
                    <div>
                        <Label>GOC Code</Label>
                        <Input value={form.goc_code} onChange={setField('goc_code')} placeholder="ST-22" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <Label>Welder(s)</Label>
                        <Input value={form.welders} onChange={setField('welders')} placeholder="BGT-0005;BGT-0015;GTC-12" />
                    </div>
                </SectionCard>

                <SectionCard emoji="ðŸ”§" title="Fit-Up / Welding completion">
                    <div>
                        <Label>FU Inspector</Label>
                        <Input value={form.fitup_inspector} onChange={setField('fitup_inspector')} placeholder="Nguyá»…n VÄƒn A" />
                    </div>
                    <div>
                        <Label>FU Date</Label>
                        <Input value={form.fitup_date} onChange={setField('fitup_date')} type="date" />
                    </div>
                    <div>
                        <Label>FU Request</Label>
                        <Input value={form.fitup_request_no} onChange={setField('fitup_request_no')} placeholder="F-044" />
                    </div>
                    <div>
                        <Label>Weld Finish Date</Label>
                        <Input value={form.weld_finish_date} onChange={setField('weld_finish_date')} type="date" />
                    </div>
                </SectionCard>

                <SectionCard emoji="ðŸ‘ï¸" title="Visual / Request / Backgouge">
                    <div>
                        <Label>Visual Inspector</Label>
                        <Input value={form.visual_inspector} onChange={setField('visual_inspector')} placeholder="Nguyá»…n VÄƒn A" />
                    </div>
                    <div>
                        <Label>Visual Date</Label>
                        <Input value={form.visual_date} onChange={setField('visual_date')} type="date" />
                    </div>
                    <div>
                        <Label>NDT / KH Visual RQ</Label>
                        <Input value={form.inspection_request_no} onChange={setField('inspection_request_no')} placeholder="V-065" />
                    </div>
                    <div>
                        <Label>BG Date</Label>
                        <Input value={form.backgouge_date} onChange={setField('backgouge_date')} type="date" />
                    </div>
                    <div>
                        <Label>BG Request</Label>
                        <Input value={form.backgouge_request_no} onChange={setField('backgouge_request_no')} placeholder="BG-043" />
                    </div>
                </SectionCard>

                <SectionCard emoji="ðŸ”¬" title="Lamcheck / NDT results">
                    <div>
                        <Label>Lamcheck Date</Label>
                        <Input value={form.lamcheck_date} onChange={setField('lamcheck_date')} type="date" />
                    </div>
                    <div>
                        <Label>Lamcheck Request</Label>
                        <Input value={form.lamcheck_request_no} onChange={setField('lamcheck_request_no')} placeholder="UL-001" />
                    </div>
                    <div>
                        <Label>Lamcheck Report</Label>
                        <Input value={form.lamcheck_report_no} onChange={setField('lamcheck_report_no')} placeholder="LC-001" />
                    </div>
                    <div>
                        <Label>MT Result</Label>
                        <Select value={form.mt_result} onChange={setField('mt_result')}>
                            {NDT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Label>MT Report</Label>
                        <Input value={form.mt_report_no} onChange={setField('mt_report_no')} placeholder="MT-2211-ST-22-0017" />
                    </div>
                    <div>
                        <Label>UT Result</Label>
                        <Select value={form.ut_result} onChange={setField('ut_result')}>
                            {NDT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Label>UT Report</Label>
                        <Input value={form.ut_report_no} onChange={setField('ut_report_no')} placeholder="UT-2211-ST-22-0033" />
                    </div>
                    <div>
                        <Label>RT Result</Label>
                        <Select value={form.rt_result} onChange={setField('rt_result')}>
                            {NDT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Label>RT Report</Label>
                        <Input value={form.rt_report_no} onChange={setField('rt_report_no')} placeholder="RT-..." />
                    </div>
                    <div>
                        <Label>PWHT Result</Label>
                        <Select value={form.pwht_result} onChange={setField('pwht_result')}>
                            {NDT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Label>Defect Length (mm)</Label>
                        <Input value={form.defect_length} onChange={setField('defect_length')} type="number" placeholder="0" />
                    </div>
                    <div>
                        <Label>Repair Length (mm)</Label>
                        <Input value={form.repair_length} onChange={setField('repair_length')} type="number" placeholder="0" />
                    </div>
                </SectionCard>

                <SectionCard emoji="âœ…" title="Release / Completion">
                    <div>
                        <Label>Release Final Date</Label>
                        <Input value={form.release_final_date} onChange={setField('release_final_date')} type="date" />
                    </div>
                    <div>
                        <Label>Release Final RQ</Label>
                        <Input value={form.release_final_request_no} onChange={setField('release_final_request_no')} placeholder="FINAL-V-141" />
                    </div>
                    <div>
                        <Label>Release Note / IRN</Label>
                        <Input value={form.release_note_no} onChange={setField('release_note_no')} placeholder="IRN-2211-ST-22-0001" />
                    </div>
                    <div>
                        <Label>Release Date</Label>
                        <Input value={form.release_note_date} onChange={setField('release_note_date')} type="date" />
                    </div>
                    <div>
                        <Label>NDT after PWHT</Label>
                        <Input value={form.ndt_after_pwht} onChange={setField('ndt_after_pwht')} placeholder="MT / UT / RT" />
                    </div>
                    <div>
                        <Label>Cut Off</Label>
                        <Input value={form.cut_off} onChange={setField('cut_off')} placeholder="Cut-off ref" />
                    </div>
                    <div>
                        <Label>MW1</Label>
                        <Input value={form.mw1_no} onChange={setField('mw1_no')} placeholder="MW1-..." />
                    </div>
                    <div>
                        <Label>Transmittal No</Label>
                        <Input value={form.transmittal_no} onChange={setField('transmittal_no')} placeholder="TR-..." />
                    </div>
                    <div>
                        <Label>Contractor Issue</Label>
                        <Input value={form.contractor_issue} onChange={setField('contractor_issue')} placeholder="Nha thau hong" />
                    </div>
                    <div>
                        <Label>Stage</Label>
                        <Select value={form.stage} onChange={setField('stage')}>
                            <option value="">-- Tá»± Ä‘á»™ng --</option>
                            {Object.entries(STAGE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </Select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <Label>Note</Label>
                        <textarea
                            className="form-input"
                            rows={2}
                            value={form.note}
                            onChange={(event) => setField('note')(event.target.value)}
                            placeholder="Ghi chu close-out / release..."
                            style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box', marginBottom: '12px' }}
                        />
                        <Label>Remarks</Label>
                        <textarea
                            className="form-input"
                            rows={3}
                            value={form.remarks}
                            onChange={(event) => setField('remarks')(event.target.value)}
                            placeholder="Ghi chÃº thÃªm..."
                            style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                </SectionCard>

                <div
                    style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '16px 24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                    }}
                >
                    <Link href="/welds" className="btn btn-secondary">Há»§y</Link>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'â³ Äang lÆ°u...' : 'ðŸ’¾ LÆ°u thay Ä‘á»•i'}
                    </button>
                </div>
            </form>
        </div>
    )
}

