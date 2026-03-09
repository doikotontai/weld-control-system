'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STAGE_LABELS, WeldStage } from '@/types'

interface WeldInsertRow {
    project_id: string
    weld_id: string
    weld_no: string
    drawing_no: string
    is_repair: boolean
    joint_type: string | null
    ndt_requirements: string | null
    wps_no: string | null
    goc_code: string | null
    weld_length: number | null
    thickness: number | null
    weld_size: string | null
    welders: string | null
    fitup_request_no: string | null
    fitup_date: string | null
    inspection_request_no: string | null
    visual_date: string | null
    backgouge_request_no: string | null
    backgouge_date: string | null
    mt_result: string | null
    ut_result: string | null
    mt_report_no: string | null
    ut_report_no: string | null
    release_note_no: string | null
    stage: WeldStage
    remarks: string | null
}

interface WeldInsertTable {
    insert(values: WeldInsertRow): Promise<{ error: { message: string } | null }>
}

function FormLabel({ children }: { children: React.ReactNode }) {
    return <label className="form-label">{children}</label>
}

export default function NewWeldPage() {
    const supabase = createClient()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [projects, setProjects] = useState<{ id: string; code: string; name: string }[]>([])
    const [form, setForm] = useState({
        project_id: '',
        weld_no: '',
        drawing_no: '',
        joint_type: '',
        ndt_requirements: '100%MT & UT',
        wps_no: 'WPS-TNHA-S06',
        goc_code: '',
        weld_length: '',
        thickness: '',
        weld_size: '',
        welders: '',
        fitup_request_no: '',
        fitup_date: '',
        inspection_request_no: '',
        visual_date: '',
        backgouge_request_no: '',
        backgouge_date: '',
        mt_result: '',
        ut_result: '',
        mt_report_no: '',
        ut_report_no: '',
        release_note_no: '',
        stage: 'fitup' as WeldStage,
        remarks: '',
    })

    const setField = (key: keyof typeof form, value: string) => {
        setForm(current => ({ ...current, [key]: value }))
    }

    useEffect(() => {
        async function fetchProjects() {
            const { data } = await supabase.from('projects').select('id, code, name')
            if (data) {
                setProjects(data)
            }
        }

        void fetchProjects()
    }, [supabase])

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setLoading(true)
        setError('')

        if (!form.project_id || !form.weld_no || !form.drawing_no) {
            setError('Du an, so moi han va ban ve la bat buoc.')
            setLoading(false)
            return
        }

        const drawingNo = form.drawing_no.trim()
        const weldNo = form.weld_no.trim()
        const weldId = `${drawingNo}${/-WM$/i.test(drawingNo) ? '' : '-WM'}${weldNo}`.replace(/\s/g, '')

        const insertData: WeldInsertRow = {
            project_id: form.project_id,
            weld_id: weldId,
            weld_no: weldNo,
            drawing_no: drawingNo,
            is_repair: /R\d+$/i.test(weldNo),
            joint_type: form.joint_type || null,
            ndt_requirements: form.ndt_requirements || null,
            wps_no: form.wps_no || null,
            goc_code: form.goc_code || null,
            weld_length: form.weld_length ? parseFloat(form.weld_length) : null,
            thickness: form.thickness ? parseInt(form.thickness, 10) : null,
            weld_size: form.weld_size || null,
            welders: form.welders || null,
            fitup_request_no: form.fitup_request_no || null,
            fitup_date: form.fitup_date || null,
            inspection_request_no: form.inspection_request_no || null,
            visual_date: form.visual_date || null,
            backgouge_request_no: form.backgouge_request_no || null,
            backgouge_date: form.backgouge_date || null,
            mt_result: form.mt_result || null,
            ut_result: form.ut_result || null,
            mt_report_no: form.mt_report_no || null,
            ut_report_no: form.ut_report_no || null,
            release_note_no: form.release_note_no || null,
            stage: form.stage,
            remarks: form.remarks || null,
        }

        const weldInsertTable = supabase.from('welds') as unknown as WeldInsertTable
        const { error: insertError } = await weldInsertTable.insert(insertData)

        if (insertError) {
            setError(`Loi: ${insertError.message}`)
        } else {
            setSuccess(`Da tao moi han ${weldId} thanh cong.`)
            router.refresh()
            setTimeout(() => {
                window.location.href = '/welds'
            }, 1500)
        }

        setLoading(false)
    }

    return (
        <div className="page-enter">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Tao moi han moi</h1>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>Nhap thong tin moi han vao he thong</p>
                </div>
                <Link href="/welds" className="btn btn-secondary">
                    Quay lai
                </Link>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', color: '#1e40af' }}>
                        Thong tin co ban
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div>
                            <FormLabel>Du an *</FormLabel>
                            <select className="form-input" required value={form.project_id} onChange={event => setField('project_id', event.target.value)}>
                                <option value="">-- Chon du an --</option>
                                {projects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.code}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FormLabel>So ban ve (Drawing No.) *</FormLabel>
                            <input className="form-input" value={form.drawing_no} onChange={event => setField('drawing_no', event.target.value)} placeholder="9001-2211-DS-0032-01-WM" required />
                        </div>
                        <div>
                            <FormLabel>So moi han (Weld No.) *</FormLabel>
                            <input className="form-input" value={form.weld_no} onChange={event => setField('weld_no', event.target.value)} placeholder="1, 17, 17R1" required />
                        </div>
                        <div>
                            <FormLabel>Loai moi han (Joint Type)</FormLabel>
                            <select className="form-input" value={form.joint_type} onChange={event => setField('joint_type', event.target.value)}>
                                <option value="">-- Chon --</option>
                                <option value="DB">DB</option>
                                <option value="DV">DV</option>
                                <option value="SB">SB</option>
                                <option value="SV">SV</option>
                                <option value="X2">X2</option>
                                <option value="X3">X3</option>
                            </select>
                        </div>
                        <div>
                            <FormLabel>Yeu cau NDT</FormLabel>
                            <input className="form-input" value={form.ndt_requirements} onChange={event => setField('ndt_requirements', event.target.value)} placeholder="100%MT & UT" />
                        </div>
                        <div>
                            <FormLabel>WPS No.</FormLabel>
                            <input className="form-input" value={form.wps_no} onChange={event => setField('wps_no', event.target.value)} placeholder="WPS-TNHA-S06" />
                        </div>
                        <div>
                            <FormLabel>GOC Code (Khu vuc)</FormLabel>
                            <input className="form-input" value={form.goc_code} onChange={event => setField('goc_code', event.target.value)} placeholder="ST-22" />
                        </div>
                        <div>
                            <FormLabel>Chieu dai (mm)</FormLabel>
                            <input className="form-input" type="number" value={form.weld_length} onChange={event => setField('weld_length', event.target.value)} placeholder="2392.68" />
                        </div>
                        <div>
                            <FormLabel>Chieu day (mm)</FormLabel>
                            <input className="form-input" type="number" value={form.thickness} onChange={event => setField('thickness', event.target.value)} placeholder="25" />
                        </div>
                        <div>
                            <FormLabel>Kich thuoc moi han</FormLabel>
                            <input className="form-input" value={form.weld_size} onChange={event => setField('weld_size', event.target.value)} placeholder="OD762x15" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <FormLabel>Tho han (Welders) - phan cach bang dau cham phay (;)</FormLabel>
                            <input className="form-input" value={form.welders} onChange={event => setField('welders', event.target.value)} placeholder="BGT-0005;BGT-0015;GTC-12" />
                        </div>
                    </div>
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', color: '#1e40af' }}>
                        Kiem tra Fit-Up
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                        <div>
                            <FormLabel>So yeu cau Fit-Up (F-xxx)</FormLabel>
                            <input className="form-input" value={form.fitup_request_no} onChange={event => setField('fitup_request_no', event.target.value)} placeholder="F-044" />
                        </div>
                        <div>
                            <FormLabel>Ngay kiem tra Fit-Up</FormLabel>
                            <input className="form-input" type="date" value={form.fitup_date} onChange={event => setField('fitup_date', event.target.value)} />
                        </div>
                        <div>
                            <FormLabel>So yeu cau Backgouge (BG-xxx)</FormLabel>
                            <input className="form-input" value={form.backgouge_request_no} onChange={event => setField('backgouge_request_no', event.target.value)} placeholder="BG-043" />
                        </div>
                        <div>
                            <FormLabel>Ngay Backgouge</FormLabel>
                            <input className="form-input" type="date" value={form.backgouge_date} onChange={event => setField('backgouge_date', event.target.value)} />
                        </div>
                    </div>
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', color: '#1e40af' }}>
                        Ket qua NDT / Visual
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                        <div>
                            <FormLabel>So request NDT / KH visual (V-xxx)</FormLabel>
                            <input className="form-input" value={form.inspection_request_no} onChange={event => setField('inspection_request_no', event.target.value)} placeholder="V-065" />
                        </div>
                        <div>
                            <FormLabel>Ngay Visual</FormLabel>
                            <input className="form-input" type="date" value={form.visual_date} onChange={event => setField('visual_date', event.target.value)} />
                        </div>
                        <div>
                            <FormLabel>Ket qua MT</FormLabel>
                            <select className="form-input" value={form.mt_result} onChange={event => setField('mt_result', event.target.value)}>
                                <option value="">-- Chua co --</option>
                                <option value="ACC">ACC (Chap nhan)</option>
                                <option value="REJ">REJ (Tu choi)</option>
                                <option value="N/A">N/A</option>
                            </select>
                        </div>
                        <div>
                            <FormLabel>Bao cao MT</FormLabel>
                            <input className="form-input" value={form.mt_report_no} onChange={event => setField('mt_report_no', event.target.value)} placeholder="MT-2211-ST-22-0017" />
                        </div>
                        <div>
                            <FormLabel>Ket qua UT</FormLabel>
                            <select className="form-input" value={form.ut_result} onChange={event => setField('ut_result', event.target.value)}>
                                <option value="">-- Chua co --</option>
                                <option value="ACC">ACC (Chap nhan)</option>
                                <option value="REJ">REJ (Tu choi)</option>
                                <option value="N/A">N/A</option>
                            </select>
                        </div>
                        <div>
                            <FormLabel>Bao cao UT</FormLabel>
                            <input className="form-input" value={form.ut_report_no} onChange={event => setField('ut_report_no', event.target.value)} placeholder="UT-2211-ST-22-0033" />
                        </div>
                        <div>
                            <FormLabel>IRN No.</FormLabel>
                            <input className="form-input" value={form.release_note_no} onChange={event => setField('release_note_no', event.target.value)} placeholder="IRN-2211-ST-22-0001" />
                        </div>
                        <div>
                            <FormLabel>Stage hien tai</FormLabel>
                            <select className="form-input" value={form.stage} onChange={event => setField('stage', event.target.value as WeldStage)}>
                                {Object.entries(STAGE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ marginTop: '16px' }}>
                        <FormLabel>Ghi chu (Remarks)</FormLabel>
                        <textarea className="form-input" rows={3} value={form.remarks} onChange={event => setField('remarks', event.target.value)} placeholder="Ghi chu them..." style={{ resize: 'vertical' }} />
                    </div>
                </div>

                {error && (
                    <div
                        style={{
                            padding: '12px 16px',
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            borderRadius: '8px',
                            color: '#991b1b',
                            marginBottom: '16px',
                        }}
                    >
                        {error}
                    </div>
                )}

                {success && (
                    <div
                        style={{
                            padding: '12px 16px',
                            background: '#dcfce7',
                            border: '1px solid #86efac',
                            borderRadius: '8px',
                            color: '#166534',
                            marginBottom: '16px',
                        }}
                    >
                        {success}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Link href="/welds" className="btn btn-secondary">
                        Huy
                    </Link>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Dang luu...' : 'Luu moi han'}
                    </button>
                </div>
            </form>
        </div>
    )
}


