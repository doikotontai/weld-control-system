'use client'
// app/(dashboard)/welds/[id]/edit/page.tsx — Chỉnh sửa thông tin mối hàn
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { WeldStage, STAGE_LABELS } from '@/types'

const NDT_OPTIONS = [
    { value: '', label: '-- Chưa có --' },
    { value: 'ACC', label: 'ACC (Chấp nhận)' },
    { value: 'REJ', label: 'REJ (Từ chối)' },
    { value: 'N/A', label: 'N/A' },
]

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {children}{required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
    </label>
)

const Input = ({ value, onChange, type = 'text', placeholder }: {
    value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) => (
    <input
        type={type}
        className="form-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box' }}
    />
)

const Select = ({ value, onChange, children }: {
    value: string; onChange: (v: string) => void; children: React.ReactNode
}) => (
    <select className="form-input" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
        {children}
    </select>
)

const SectionCard = ({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) => (
    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{emoji}</span> {title}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {children}
        </div>
    </div>
)

type FormData = Record<string, string>

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

    const emptyForm: FormData = {
        weld_id: '', drawing_no: '', weld_no: '',
        joint_family: '', joint_type: '',
        ndt_requirements: '', position: '',
        weld_length: '', thickness: '', thickness_lamcheck: '',
        wps_no: '', goc_code: '',
        fitup_inspector: '', fitup_date: '', fitup_request_no: '', fitup_accepted_date: '',
        welders: '',
        visual_inspector: '', visual_date: '', visual_request_no: '',
        backgouge_date: '', backgouge_request_no: '',
        mt_result: '', mt_report_no: '',
        ut_result: '', ut_report_no: '',
        rt_result: '', rt_report_no: '',
        lamcheck_date: '', lamcheck_request_no: '', lamcheck_report_no: '',
        irn_no: '', irn_date: '',
        pwht_result: '',
        defect_length: '', repair_length: '',
        stage: '', remarks: '',
    }
    const [form, setForm] = useState<FormData>(emptyForm)
    const [weldDisplayId, setWeldDisplayId] = useState('')

    const set = (key: string) => (val: string) => setForm(f => ({ ...f, [key]: val }))

    const fmtDate = (v: unknown): string => {
        if (!v) return ''
        return String(v).slice(0, 10)
    }

    // Load weld data
    useEffect(() => {
        async function load() {
            const { data, error: err } = await (supabase.from('welds') as any).select('*').eq('id', id).single()
            if (err || !data) {
                setError('Không tìm thấy mối hàn')
                setLoading(false)
                return
            }
            const d = data as Record<string, unknown>
            setWeldDisplayId(String(d.weld_id || ''))
            setForm({
                weld_id: String(d.weld_id || ''),
                drawing_no: String(d.drawing_no || ''),
                weld_no: String(d.weld_no || ''),
                joint_family: String(d.joint_family || ''),
                joint_type: String(d.joint_type || ''),
                ndt_requirements: String(d.ndt_requirements || ''),
                position: String(d.position || ''),
                weld_length: d.weld_length != null ? String(d.weld_length) : '',
                thickness: d.thickness != null ? String(d.thickness) : '',
                thickness_lamcheck: d.thickness_lamcheck != null ? String(d.thickness_lamcheck) : '',
                wps_no: String(d.wps_no || ''),
                goc_code: String(d.goc_code || ''),
                fitup_inspector: String(d.fitup_inspector || ''),
                fitup_date: fmtDate(d.fitup_date),
                fitup_request_no: String(d.fitup_request_no || ''),
                fitup_accepted_date: fmtDate(d.fitup_accepted_date),
                welders: String(d.welders || ''),
                visual_inspector: String(d.visual_inspector || ''),
                visual_date: fmtDate(d.visual_date),
                visual_request_no: String(d.visual_request_no || ''),
                backgouge_date: fmtDate(d.backgouge_date),
                backgouge_request_no: String(d.backgouge_request_no || ''),
                mt_result: String(d.mt_result || ''),
                mt_report_no: String(d.mt_report_no || ''),
                ut_result: String(d.ut_result || ''),
                ut_report_no: String(d.ut_report_no || ''),
                rt_result: String(d.rt_result || ''),
                rt_report_no: String(d.rt_report_no || ''),
                lamcheck_date: fmtDate(d.lamcheck_date),
                lamcheck_request_no: String(d.lamcheck_request_no || ''),
                lamcheck_report_no: String(d.lamcheck_report_no || ''),
                irn_no: String(d.irn_no || ''),
                irn_date: fmtDate(d.irn_date),
                pwht_result: String(d.pwht_result || ''),
                defect_length: d.defect_length != null ? String(d.defect_length) : '',
                repair_length: d.repair_length != null ? String(d.repair_length) : '',
                stage: String(d.stage || ''),
                remarks: String(d.remarks || ''),
            })
            setLoading(false)
        }
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        setSuccess('')

        const updateData = {
            weld_id: form.weld_id || null,
            drawing_no: form.drawing_no || null,
            weld_no: form.weld_no ? parseInt(form.weld_no) : null,
            joint_family: form.joint_family || null,
            joint_type: form.joint_type || null,
            ndt_requirements: form.ndt_requirements || null,
            position: form.position || null,
            weld_length: form.weld_length ? parseFloat(form.weld_length) : null,
            thickness: form.thickness ? parseInt(form.thickness) : null,
            thickness_lamcheck: form.thickness_lamcheck ? parseFloat(form.thickness_lamcheck) : null,
            wps_no: form.wps_no || null,
            goc_code: form.goc_code || null,
            fitup_inspector: form.fitup_inspector || null,
            fitup_date: form.fitup_date || null,
            fitup_request_no: form.fitup_request_no || null,
            fitup_accepted_date: form.fitup_accepted_date || null,
            welders: form.welders || null,
            visual_inspector: form.visual_inspector || null,
            visual_date: form.visual_date || null,
            visual_request_no: form.visual_request_no || null,
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
            irn_no: form.irn_no || null,
            irn_date: form.irn_date || null,
            pwht_result: form.pwht_result || null,
            defect_length: form.defect_length ? parseFloat(form.defect_length) : null,
            repair_length: form.repair_length ? parseFloat(form.repair_length) : null,
            stage: form.stage || null,
            remarks: form.remarks || null,
        }

        const { error: updateError } = await (supabase.from('welds') as any).update(updateData).eq('id', id)

        if (updateError) {
            setError(`Lỗi lưu: ${updateError.message}`)
        } else {
            setSuccess('✅ Đã lưu thành công!')
            setTimeout(() => setSuccess(''), 3000)
        }
        setSaving(false)
    }

    const handleDelete = async () => {
        setDeleting(true)
        const { error: delError } = await (supabase.from('welds') as any).delete().eq('id', id)
        if (delError) {
            setError(`Lỗi xóa: ${delError.message}`)
            setDeleting(false)
        } else {
            router.push('/welds')
        }
    }

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '80px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#64748b' }}>Đang tải...</p>
        </div>
    )

    return (
        <div className="page-enter">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>✏️ Sửa mối hàn</h1>
                    <p style={{ color: '#64748b', marginTop: '4px', fontFamily: 'monospace', fontSize: '0.95rem' }}>{weldDisplayId}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href="/welds" className="btn btn-secondary">← Danh sách</Link>
                    {!confirmDelete ? (
                        <button className="btn" onClick={() => setConfirmDelete(true)}
                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                            🗑️ Xóa
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.875rem' }}>Xác nhận xóa?</span>
                            <button className="btn" onClick={handleDelete} disabled={deleting}
                                style={{ background: '#dc2626', color: 'white', border: 'none' }}>
                                {deleting ? '⏳' : '✓ Xóa'}</button>
                            <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>✕ Hủy</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Error / Success */}
            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', marginBottom: '16px' }}>{error}</div>}
            {success && <div style={{ padding: '12px 16px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', marginBottom: '16px' }}>{success}</div>}

            <form onSubmit={handleSave}>
                {/* 1. Thông tin cơ bản */}
                <SectionCard emoji="📋" title="Thông tin cơ bản">
                    <div>
                        <Label>Weld ID (& column)</Label>
                        <Input value={form.weld_id} onChange={set('weld_id')} placeholder="9001-2211-DS-0032-01-WM1" />
                    </div>
                    <div>
                        <Label>DrawingNo</Label>
                        <Input value={form.drawing_no} onChange={set('drawing_no')} placeholder="9001-2211-DS-0032-01-WM" />
                    </div>
                    <div>
                        <Label>Weld No</Label>
                        <Input value={form.weld_no} onChange={set('weld_no')} type="number" placeholder="1" />
                    </div>
                    <div>
                        <Label>Weld Joints</Label>
                        <Input value={form.joint_family} onChange={set('joint_family')} placeholder="X1, X2, X3..." />
                    </div>
                    <div>
                        <Label>Weld Type</Label>
                        <Select value={form.joint_type} onChange={set('joint_type')}>
                            <option value="">-- Chọn --</option>
                            {['DB', 'DV', 'SB', 'SV', 'X1', 'X2', 'X3'].map(t => <option key={t} value={t}>{t}</option>)}
                        </Select>
                    </div>
                    <div>
                        <Label>NDT</Label>
                        <Input value={form.ndt_requirements} onChange={set('ndt_requirements')} placeholder="100%MT & UT" />
                    </div>
                    <div>
                        <Label>OD /L (position)</Label>
                        <Input value={form.position} onChange={set('position')} placeholder="X1, X2..." />
                    </div>
                    <div>
                        <Label>Length (mm)</Label>
                        <Input value={form.weld_length} onChange={set('weld_length')} type="number" placeholder="2392.68" />
                    </div>
                    <div>
                        <Label>Thick (mm)</Label>
                        <Input value={form.thickness} onChange={set('thickness')} type="number" placeholder="25" />
                    </div>
                    <div>
                        <Label>Thick LC</Label>
                        <Input value={form.thickness_lamcheck} onChange={set('thickness_lamcheck')} type="number" placeholder="25" />
                    </div>
                    <div>
                        <Label>WPS No.</Label>
                        <Input value={form.wps_no} onChange={set('wps_no')} placeholder="WPS-TNHA-S06" />
                    </div>
                    <div>
                        <Label>GOC Code</Label>
                        <Input value={form.goc_code} onChange={set('goc_code')} placeholder="ST-22" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <Label>{"Welders' ID"}</Label>
                        <Input value={form.welders} onChange={set('welders')} placeholder="BGT-0005;BGT-0015;GTC-12" />
                    </div>
                </SectionCard>

                {/* 2. Fit-Up */}
                <SectionCard emoji="🔧" title="Fit-Up (FU)">
                    <div>
                        <Label>FU Inspector</Label>
                        <Input value={form.fitup_inspector} onChange={set('fitup_inspector')} placeholder="Nguyễn Văn A" />
                    </div>
                    <div>
                        <Label>FU Date</Label>
                        <Input value={form.fitup_date} onChange={set('fitup_date')} type="date" />
                    </div>
                    <div>
                        <Label>FU Request</Label>
                        <Input value={form.fitup_request_no} onChange={set('fitup_request_no')} placeholder="F-044" />
                    </div>
                    <div>
                        <Label>FU Finish (accepted date)</Label>
                        <Input value={form.fitup_accepted_date} onChange={set('fitup_accepted_date')} type="date" />
                    </div>
                </SectionCard>

                {/* 3. Visual & Backgouge */}
                <SectionCard emoji="👁️" title="Visual (VS) & Backgouge (BG)">
                    <div>
                        <Label>VS Inspector</Label>
                        <Input value={form.visual_inspector} onChange={set('visual_inspector')} placeholder="Nguyễn Văn A" />
                    </div>
                    <div>
                        <Label>VS Date</Label>
                        <Input value={form.visual_date} onChange={set('visual_date')} type="date" />
                    </div>
                    <div>
                        <Label>VS Request</Label>
                        <Input value={form.visual_request_no} onChange={set('visual_request_no')} placeholder="V-065" />
                    </div>
                    <div>
                        <Label>BG Date</Label>
                        <Input value={form.backgouge_date} onChange={set('backgouge_date')} type="date" />
                    </div>
                    <div>
                        <Label>BG Request</Label>
                        <Input value={form.backgouge_request_no} onChange={set('backgouge_request_no')} placeholder="BG-043" />
                    </div>
                </SectionCard>

                {/* 4. NDT Results */}
                <SectionCard emoji="🔬" title="Kết quả NDT">
                    <div>
                        <Label>MT Result</Label>
                        <Select value={form.mt_result} onChange={set('mt_result')}>
                            {NDT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </Select>
                    </div>
                    <div>
                        <Label>MT Report</Label>
                        <Input value={form.mt_report_no} onChange={set('mt_report_no')} placeholder="MT-2211-ST-22-0017" />
                    </div>
                    <div>
                        <Label>UT Result</Label>
                        <Select value={form.ut_result} onChange={set('ut_result')}>
                            {NDT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </Select>
                    </div>
                    <div>
                        <Label>UT Report</Label>
                        <Input value={form.ut_report_no} onChange={set('ut_report_no')} placeholder="UT-2211-ST-22-0033" />
                    </div>
                    <div>
                        <Label>RT Result</Label>
                        <Select value={form.rt_result} onChange={set('rt_result')}>
                            {NDT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </Select>
                    </div>
                    <div>
                        <Label>RT Report</Label>
                        <Input value={form.rt_report_no} onChange={set('rt_report_no')} placeholder="RT-..." />
                    </div>
                    <div>
                        <Label>Lamcheck Date</Label>
                        <Input value={form.lamcheck_date} onChange={set('lamcheck_date')} type="date" />
                    </div>
                    <div>
                        <Label>Lamcheck Request</Label>
                        <Input value={form.lamcheck_request_no} onChange={set('lamcheck_request_no')} placeholder="LC-..." />
                    </div>
                    <div>
                        <Label>Lamcheck Report</Label>
                        <Input value={form.lamcheck_report_no} onChange={set('lamcheck_report_no')} placeholder="LC-..." />
                    </div>
                    <div>
                        <Label>Defect Length (mm)</Label>
                        <Input value={form.defect_length} onChange={set('defect_length')} type="number" placeholder="0" />
                    </div>
                    <div>
                        <Label>Repair Length (mm)</Label>
                        <Input value={form.repair_length} onChange={set('repair_length')} type="number" placeholder="0" />
                    </div>
                </SectionCard>

                {/* 5. IRN & Completion */}
                <SectionCard emoji="✅" title="IRN & Hoàn công">
                    <div>
                        <Label>IRN No</Label>
                        <Input value={form.irn_no} onChange={set('irn_no')} placeholder="IRN-2211-ST-22-0001" />
                    </div>
                    <div>
                        <Label>IRN Date</Label>
                        <Input value={form.irn_date} onChange={set('irn_date')} type="date" />
                    </div>
                    <div>
                        <Label>PWHT Result</Label>
                        <Select value={form.pwht_result} onChange={set('pwht_result')}>
                            {NDT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </Select>
                    </div>
                    <div>
                        <Label>Stage</Label>
                        <Select value={form.stage} onChange={set('stage')}>
                            <option value="">-- Tự động --</option>
                            {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </Select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <Label>Remarks (Ghi chú)</Label>
                        <textarea
                            className="form-input"
                            rows={3}
                            value={form.remarks}
                            onChange={e => set('remarks')(e.target.value)}
                            placeholder="Ghi chú thêm..."
                            style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                </SectionCard>

                {/* Action bar */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '16px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <Link href="/welds" className="btn btn-secondary">Hủy</Link>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
                    </button>
                </div>
            </form>
        </div>
    )
}
