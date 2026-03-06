'use client'
// app/(dashboard)/welds/new/page.tsx — Form tạo mối hàn mới
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { WeldStage, STAGE_LABELS } from '@/types'

export default function NewWeldPage() {
    const supabase = createClient()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Form state
    const [projects, setProjects] = useState<{ id: string, code: string, name: string }[]>([])

    // Default form configuration
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
        visual_request_no: '',
        visual_date: '',
        backgouge_request_no: '',
        backgouge_date: '',
        mt_result: '',
        ut_result: '',
        mt_report_no: '',
        ut_report_no: '',
        irn_no: '',
        stage: 'fitup' as WeldStage,
        remarks: '',
    })

    const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

    // Load available projects
    useEffect(() => {
        async function fetchProjects() {
            const { data } = await supabase.from('projects').select('id, code, name')
            if (data) setProjects(data)
        }
        fetchProjects()
    }, [supabase])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validate required fields
        if (!form.project_id || !form.weld_no || !form.drawing_no) {
            setError('Dự án, Số mối hàn và Bản vẽ là bắt buộc!')
            setLoading(false)
            return
        }

        // Build weld_id
        const weldId = `${form.drawing_no}-WM${form.weld_no}`.replace(/\s/g, '')

        const insertData = {
            project_id: form.project_id,
            weld_id: weldId,
            weld_no: form.weld_no,
            drawing_no: form.drawing_no,
            is_repair: form.weld_no.includes('R'),
            joint_type: form.joint_type || null,
            ndt_requirements: form.ndt_requirements || null,
            wps_no: form.wps_no || null,
            goc_code: form.goc_code || null,
            weld_length: form.weld_length ? parseFloat(form.weld_length) : null,
            thickness: form.thickness ? parseInt(form.thickness) : null,
            weld_size: form.weld_size || null,
            welders: form.welders || null,
            fitup_request_no: form.fitup_request_no || null,
            fitup_date: form.fitup_date || null,
            visual_request_no: form.visual_request_no || null,
            visual_date: form.visual_date || null,
            backgouge_request_no: form.backgouge_request_no || null,
            backgouge_date: form.backgouge_date || null,
            mt_result: form.mt_result || null,
            ut_result: form.ut_result || null,
            mt_report_no: form.mt_report_no || null,
            ut_report_no: form.ut_report_no || null,
            irn_no: form.irn_no || null,
            stage: form.stage,
            remarks: form.remarks || null,
        }

        const { error: insertError } = await (supabase.from('welds') as any).insert(insertData)

        if (insertError) {
            setError(`Lỗi: ${insertError.message}`)
        } else {
            setSuccess(`✅ Đã tạo mối hàn ${weldId} thành công!`)
            router.refresh()
            setTimeout(() => {
                window.location.href = '/welds' // Force hard reload to guarantee fresh data
            }, 1500)
        }
        setLoading(false)
    }

    const Label = ({ children }: { children: React.ReactNode }) => (
        <label className="form-label">{children}</label>
    )

    return (
        <div className="page-enter">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>➕ Tạo mối hàn mới</h1>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>Nhập thông tin mối hàn vào hệ thống</p>
                </div>
                <Link href="/welds" className="btn btn-secondary">← Quay lại</Link>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Section 1: Thông tin cơ bản */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', color: '#1e40af' }}>
                        📋 Thông tin cơ bản
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div>
                            <Label>Dự án *</Label>
                            <select
                                className="form-input"
                                required
                                value={form.project_id}
                                onChange={e => set('project_id', e.target.value)}
                            >
                                <option value="">-- Chọn Dự án --</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.code}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Số bản vẽ (Drawing No.) *</Label>
                            <input className="form-input" value={form.drawing_no} onChange={e => set('drawing_no', e.target.value)} placeholder="9001-2211-DS-0032-01-WM" required />
                        </div>
                        <div>
                            <Label>Số mối hàn (Weld No.) *</Label>
                            <input className="form-input" value={form.weld_no} onChange={e => set('weld_no', e.target.value)} placeholder="1, 17, 17R1" required />
                        </div>
                        <div>
                            <Label>Loại mối hàn (Joint Type)</Label>
                            <select className="form-input" value={form.joint_type} onChange={e => set('joint_type', e.target.value)}>
                                <option value="">-- Chọn --</option>
                                <option value="DB">DB</option>
                                <option value="DV">DV</option>
                                <option value="SB">SB</option>
                                <option value="SV">SV</option>
                                <option value="X2">X2</option>
                                <option value="X3">X3</option>
                            </select>
                        </div>
                        <div>
                            <Label>Yêu cầu NDT</Label>
                            <input className="form-input" value={form.ndt_requirements} onChange={e => set('ndt_requirements', e.target.value)} placeholder="100%MT & UT" />
                        </div>
                        <div>
                            <Label>WPS No.</Label>
                            <input className="form-input" value={form.wps_no} onChange={e => set('wps_no', e.target.value)} placeholder="WPS-TNHA-S06" />
                        </div>
                        <div>
                            <Label>GOC Code (Khu vực)</Label>
                            <input className="form-input" value={form.goc_code} onChange={e => set('goc_code', e.target.value)} placeholder="ST-22" />
                        </div>
                        <div>
                            <Label>Chiều dài (mm)</Label>
                            <input className="form-input" type="number" value={form.weld_length} onChange={e => set('weld_length', e.target.value)} placeholder="2392.68" />
                        </div>
                        <div>
                            <Label>Chiều dày (mm)</Label>
                            <input className="form-input" type="number" value={form.thickness} onChange={e => set('thickness', e.target.value)} placeholder="25" />
                        </div>
                        <div>
                            <Label>Kích thước mối hàn</Label>
                            <input className="form-input" value={form.weld_size} onChange={e => set('weld_size', e.target.value)} placeholder="Ø762x15" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <Label>Thợ hàn (Welders) — Phân cách bằng dấu chấm phẩy (;)</Label>
                            <input className="form-input" value={form.welders} onChange={e => set('welders', e.target.value)} placeholder="BGT-0005;BGT-0015;GTC-12" />
                        </div>
                    </div>
                </div>

                {/* Section 2: Kiểm tra Fit-Up */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', color: '#1e40af' }}>
                        🔧 Kiểm tra Fit-Up
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                        <div>
                            <Label>Số yêu cầu Fit-Up (F-xxx)</Label>
                            <input className="form-input" value={form.fitup_request_no} onChange={e => set('fitup_request_no', e.target.value)} placeholder="F-044" />
                        </div>
                        <div>
                            <Label>Ngày kiểm tra Fit-Up</Label>
                            <input className="form-input" type="date" value={form.fitup_date} onChange={e => set('fitup_date', e.target.value)} />
                        </div>
                        <div>
                            <Label>Số yêu cầu Backgouge (BG-xxx)</Label>
                            <input className="form-input" value={form.backgouge_request_no} onChange={e => set('backgouge_request_no', e.target.value)} placeholder="BG-043" />
                        </div>
                        <div>
                            <Label>Ngày Backgouge</Label>
                            <input className="form-input" type="date" value={form.backgouge_date} onChange={e => set('backgouge_date', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Section 3: Kết quả NDT */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', color: '#1e40af' }}>
                        🔬 Kết quả NDT / Visual
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                        <div>
                            <Label>Số yêu cầu Visual (V-xxx)</Label>
                            <input className="form-input" value={form.visual_request_no} onChange={e => set('visual_request_no', e.target.value)} placeholder="V-065" />
                        </div>
                        <div>
                            <Label>Ngày Visual</Label>
                            <input className="form-input" type="date" value={form.visual_date} onChange={e => set('visual_date', e.target.value)} />
                        </div>
                        <div>
                            <Label>Kết quả MT</Label>
                            <select className="form-input" value={form.mt_result} onChange={e => set('mt_result', e.target.value)}>
                                <option value="">-- Chưa có --</option>
                                <option value="ACC">ACC (Chấp nhận)</option>
                                <option value="REJ">REJ (Từ chối)</option>
                                <option value="N/A">N/A</option>
                            </select>
                        </div>
                        <div>
                            <Label>Báo cáo MT</Label>
                            <input className="form-input" value={form.mt_report_no} onChange={e => set('mt_report_no', e.target.value)} placeholder="MT-2211-ST-22-0017" />
                        </div>
                        <div>
                            <Label>Kết quả UT</Label>
                            <select className="form-input" value={form.ut_result} onChange={e => set('ut_result', e.target.value)}>
                                <option value="">-- Chưa có --</option>
                                <option value="ACC">ACC (Chấp nhận)</option>
                                <option value="REJ">REJ (Từ chối)</option>
                                <option value="N/A">N/A</option>
                            </select>
                        </div>
                        <div>
                            <Label>Báo cáo UT</Label>
                            <input className="form-input" value={form.ut_report_no} onChange={e => set('ut_report_no', e.target.value)} placeholder="UT-2211-ST-22-0033" />
                        </div>
                        <div>
                            <Label>IRN No.</Label>
                            <input className="form-input" value={form.irn_no} onChange={e => set('irn_no', e.target.value)} placeholder="IRN-2211-ST-22-0001" />
                        </div>
                        <div>
                            <Label>Stage hiện tại</Label>
                            <select className="form-input" value={form.stage} onChange={e => set('stage', e.target.value as WeldStage)}>
                                {Object.entries(STAGE_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ marginTop: '16px' }}>
                        <Label>Ghi chú (Remarks)</Label>
                        <textarea className="form-input" rows={3} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Ghi chú thêm..." style={{ resize: 'vertical' }} />
                    </div>
                </div>

                {/* Error / Success */}
                {error && <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', marginBottom: '16px' }}>{error}</div>}
                {success && <div style={{ padding: '12px 16px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', marginBottom: '16px' }}>{success}</div>}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Link href="/welds" className="btn btn-secondary">Hủy</Link>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? '⏳ Đang lưu...' : '💾 Lưu mối hàn'}
                    </button>
                </div>
            </form>
        </div>
    )
}
