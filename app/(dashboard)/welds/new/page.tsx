'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { STAGE_LABELS, WeldStage } from '@/types'
import { useRoleGuard } from '@/lib/use-role-guard'

interface ProjectRow {
    id: string
    code: string
    name: string
}

type FormState = {
    project_id: string
    drawing_no: string
    weld_nos_input: string
    joint_family: string
    joint_type: string
    ndt_requirements: string
    position: string
    weld_length: string
    thickness: string
    thickness_lamcheck: string
    weld_size: string
    wps_no: string
    goc_code: string
    welders: string
    fitup_request_no: string
    fitup_date: string
    weld_finish_date: string
    inspection_request_no: string
    visual_date: string
    backgouge_request_no: string
    backgouge_date: string
    stage: WeldStage
    remarks: string
}

interface DrawingLookup {
    id: string
}

const EMPTY_FORM: FormState = {
    project_id: '',
    drawing_no: '',
    weld_nos_input: '',
    joint_family: '',
    joint_type: '',
    ndt_requirements: '100%MT & UT',
    position: '',
    weld_length: '',
    thickness: '',
    thickness_lamcheck: '',
    weld_size: '',
    wps_no: 'WPS-TNHA-S06',
    goc_code: '',
    welders: '',
    fitup_request_no: '',
    fitup_date: '',
    weld_finish_date: '',
    inspection_request_no: '',
    visual_date: '',
    backgouge_request_no: '',
    backgouge_date: '',
    stage: 'fitup',
    remarks: '',
}

function parseWeldNumbers(input: string) {
    const tokens = input
        .split(/[\n,;]+/)
        .map((token) => token.trim())
        .filter(Boolean)

    const expanded: string[] = []

    tokens.forEach((token) => {
        const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/)
        if (rangeMatch) {
            const start = Number(rangeMatch[1])
            const end = Number(rangeMatch[2])
            const step = start <= end ? 1 : -1
            for (let value = start; step > 0 ? value <= end : value >= end; value += step) {
                expanded.push(String(value))
            }
            return
        }

        expanded.push(token.toUpperCase())
    })

    return Array.from(new Set(expanded))
}

function buildWeldId(drawingNo: string, weldNo: string) {
    return `${drawingNo}${/-WM$/i.test(drawingNo) ? '' : '-WM'}${weldNo}`.replace(/\s/g, '')
}

export default function NewWeldPage() {
    const supabase = createClient()
    const router = useRouter()
    const { checking: checkingRole } = useRoleGuard(['admin', 'dcc', 'qc'])
    const [projects, setProjects] = useState<ProjectRow[]>([])
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        void supabase
            .from('projects')
            .select('id, code, name')
            .order('created_at', { ascending: false })
            .then(({ data }) => {
                setProjects((data || []) as ProjectRow[])
            })
    }, [supabase])

    const weldNumbers = useMemo(() => parseWeldNumbers(form.weld_nos_input), [form.weld_nos_input])
    const previewIds = useMemo(() => weldNumbers.slice(0, 8).map((weldNo) => buildWeldId(form.drawing_no.trim(), weldNo)), [form.drawing_no, weldNumbers])

    const setField = (key: keyof FormState, value: string) => {
        setForm((current) => ({ ...current, [key]: value }))
    }

    if (checkingRole) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang kiểm tra quyền truy cập...</div>
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setSaving(true)
        setError('')
        setSuccess('')

        const drawingNo = form.drawing_no.trim()
        if (!form.project_id || !drawingNo || weldNumbers.length === 0) {
            setError('Dự án, Drawing No. và danh sách Weld No. là bắt buộc.')
            setSaving(false)
            return
        }

        const weldIds = weldNumbers.map((weldNo) => buildWeldId(drawingNo, weldNo))

        const { data: existingRows, error: existingError } = await supabase
            .from('welds')
            .select('weld_id')
            .eq('project_id', form.project_id)
            .in('weld_id', weldIds)

        if (existingError) {
            setError(`Không kiểm tra được weld trùng: ${existingError.message}`)
            setSaving(false)
            return
        }

        const existingIds = new Set(((existingRows as Array<{ weld_id: string }> | null) || []).map((row) => row.weld_id))
        if (existingIds.size > 0) {
            setError(`Đã tồn tại ${existingIds.size} mối hàn trong dự án này. Ví dụ: ${Array.from(existingIds).slice(0, 8).join(', ')}`)
            setSaving(false)
            return
        }

        const [{ data: maxRow }, { data: drawingRow }] = await Promise.all([
            supabase
                .from('welds')
                .select('excel_row_order')
                .eq('project_id', form.project_id)
                .order('excel_row_order', { ascending: false })
                .limit(1)
                .maybeSingle(),
            supabase
                .from('drawings')
                .select('id')
                .eq('project_id', form.project_id)
                .eq('drawing_no', drawingNo)
                .maybeSingle(),
        ])

        const startOrder = Number((maxRow as { excel_row_order?: number | null } | null)?.excel_row_order || 0)
        const drawingId = (drawingRow as DrawingLookup | null)?.id || null

        const payload = weldNumbers.map((weldNo, index) => ({
            project_id: form.project_id,
            drawing_id: drawingId,
            weld_id: buildWeldId(drawingNo, weldNo),
            weld_no: weldNo,
            drawing_no: drawingNo,
            is_repair: /R\d+$/i.test(weldNo),
            joint_family: form.joint_family || null,
            joint_type: form.joint_type || null,
            ndt_requirements: form.ndt_requirements || null,
            position: form.position || null,
            weld_length: form.weld_length ? parseFloat(form.weld_length) : null,
            thickness: form.thickness ? parseInt(form.thickness, 10) : null,
            thickness_lamcheck: form.thickness_lamcheck ? parseFloat(form.thickness_lamcheck) : null,
            weld_size: form.weld_size || null,
            wps_no: form.wps_no || null,
            goc_code: form.goc_code || null,
            welders: form.welders || null,
            fitup_request_no: form.fitup_request_no || null,
            fitup_date: form.fitup_date || null,
            weld_finish_date: form.weld_finish_date || null,
            inspection_request_no: form.inspection_request_no || null,
            visual_date: form.visual_date || null,
            backgouge_request_no: form.backgouge_request_no || null,
            backgouge_date: form.backgouge_date || null,
            stage: form.stage,
            remarks: form.remarks || null,
            excel_row_order: startOrder + index + 1,
        }))

        const batchSize = 200
        for (let index = 0; index < payload.length; index += batchSize) {
            const batch = payload.slice(index, index + batchSize)
            const { error: insertError } = await supabase.from('welds').insert(batch as never[])
            if (insertError) {
                setError(`Lỗi tạo mối hàn: ${insertError.message}`)
                setSaving(false)
                return
            }
        }

        setSuccess(`Đã tạo ${payload.length} mối hàn cho bản vẽ ${drawingNo}.`)
        setTimeout(() => {
            router.push('/welds')
            router.refresh()
        }, 1200)
        setSaving(false)
    }

    return (
        <div className="page-enter">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Tạo mối hàn mới / hàng loạt</h1>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>
                        Dùng một bộ thông tin chung để tạo 1, 10, 100 hoặc hàng nghìn mối hàn cho cùng bản vẽ.
                    </p>
                </div>
                <Link href="/welds" className="btn btn-secondary">
                    Quay lại
                </Link>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '18px', color: '#1e40af' }}>1. Chọn dự án và bản vẽ</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                        <div>
                            <label className="form-label">Dự án *</label>
                            <select className="form-input" value={form.project_id} onChange={(event) => setField('project_id', event.target.value)}>
                                <option value="">-- Chọn dự án --</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.code} - {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Số bản vẽ (Drawing No.) *</label>
                            <input className="form-input" value={form.drawing_no} onChange={(event) => setField('drawing_no', event.target.value)} placeholder="9001-2211-DS-0032-01-WM" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Danh sách Weld No. *</label>
                            <textarea
                                className="form-input"
                                rows={6}
                                value={form.weld_nos_input}
                                onChange={(event) => setField('weld_nos_input', event.target.value)}
                                placeholder={`Ví dụ:\n1-50\n52\n60\n127A\n17R1`}
                                style={{ resize: 'vertical' }}
                            />
                            <div style={{ marginTop: '8px', color: '#64748b', fontSize: '0.8rem' }}>
                                Hỗ trợ nhập theo dòng, dấu phẩy, dấu chấm phẩy và dải số như <strong>1-500</strong>. Hệ thống sẽ tự bung, loại trùng và tạo hàng loạt.
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '18px', color: '#1e40af' }}>2. Metadata dùng chung cho toàn bộ mối hàn</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                        <div>
                            <label className="form-label">Weld Joints</label>
                            <input className="form-input" value={form.joint_family} onChange={(event) => setField('joint_family', event.target.value)} placeholder="X1 / X2 / DB..." />
                        </div>
                        <div>
                            <label className="form-label">Weld Type</label>
                            <input className="form-input" value={form.joint_type} onChange={(event) => setField('joint_type', event.target.value)} placeholder="DB / DV / SB / SV" />
                        </div>
                        <div>
                            <label className="form-label">Yêu cầu NDT</label>
                            <input className="form-input" value={form.ndt_requirements} onChange={(event) => setField('ndt_requirements', event.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">OD / L</label>
                            <input className="form-input" value={form.position} onChange={(event) => setField('position', event.target.value)} placeholder="D / L" />
                        </div>
                        <div>
                            <label className="form-label">Length (mm)</label>
                            <input className="form-input" type="number" value={form.weld_length} onChange={(event) => setField('weld_length', event.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Thickness (mm)</label>
                            <input className="form-input" type="number" value={form.thickness} onChange={(event) => setField('thickness', event.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Độ dày LC</label>
                            <input className="form-input" type="number" value={form.thickness_lamcheck} onChange={(event) => setField('thickness_lamcheck', event.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Weld Size</label>
                            <input className="form-input" value={form.weld_size} onChange={(event) => setField('weld_size', event.target.value)} placeholder="Ø123x25 / L=200x25" />
                        </div>
                        <div>
                            <label className="form-label">WPS No.</label>
                            <input className="form-input" value={form.wps_no} onChange={(event) => setField('wps_no', event.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">GOC Code</label>
                            <input className="form-input" value={form.goc_code} onChange={(event) => setField('goc_code', event.target.value)} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Thợ hàn</label>
                            <input className="form-input" value={form.welders} onChange={(event) => setField('welders', event.target.value)} placeholder="BGT-0005;BGT-0015;GTC-12" />
                        </div>
                    </div>
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '18px', color: '#1e40af' }}>3. Thông tin nghiệp vụ ban đầu</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                        <div>
                            <label className="form-label">Request Fit-Up</label>
                            <input className="form-input" value={form.fitup_request_no} onChange={(event) => setField('fitup_request_no', event.target.value)} placeholder="F-044" />
                        </div>
                        <div>
                            <label className="form-label">Ngày Fit-Up</label>
                            <input className="form-input" type="date" value={form.fitup_date} onChange={(event) => setField('fitup_date', event.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Ngày hoàn thành hàn</label>
                            <input className="form-input" type="date" value={form.weld_finish_date} onChange={(event) => setField('weld_finish_date', event.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">RQ NDT / KH visual</label>
                            <input className="form-input" value={form.inspection_request_no} onChange={(event) => setField('inspection_request_no', event.target.value)} placeholder="V-154" />
                        </div>
                        <div>
                            <label className="form-label">Ngày Visual</label>
                            <input className="form-input" type="date" value={form.visual_date} onChange={(event) => setField('visual_date', event.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Request Backgouge</label>
                            <input className="form-input" value={form.backgouge_request_no} onChange={(event) => setField('backgouge_request_no', event.target.value)} placeholder="BG-043" />
                        </div>
                        <div>
                            <label className="form-label">Ngày Backgouge</label>
                            <input className="form-input" type="date" value={form.backgouge_date} onChange={(event) => setField('backgouge_date', event.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Stage ban đầu</label>
                            <select className="form-input" value={form.stage} onChange={(event) => setField('stage', event.target.value)}>
                                {Object.entries(STAGE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Ghi chú</label>
                            <textarea className="form-input" rows={3} value={form.remarks} onChange={(event) => setField('remarks', event.target.value)} style={{ resize: 'vertical' }} />
                        </div>
                    </div>
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '14px', color: '#1e40af' }}>4. Xem trước danh sách sẽ tạo</h3>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <div className="badge badge-pending">Tổng số Weld No.: {weldNumbers.length}</div>
                        <div className="badge badge-na">Ví dụ ID: {previewIds[0] || '-'}</div>
                    </div>
                    {previewIds.length > 0 ? (
                        <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#334155', display: 'grid', gap: '4px' }}>
                            {previewIds.map((value) => (
                                <div key={value}>{value}</div>
                            ))}
                            {weldNumbers.length > previewIds.length ? <div>... và {weldNumbers.length - previewIds.length} dòng nữa</div> : null}
                        </div>
                    ) : (
                        <div style={{ color: '#94a3b8' }}>Nhập danh sách Weld No. để xem preview.</div>
                    )}
                </div>

                {error ? <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b' }}>{error}</div> : null}
                {success ? <div style={{ padding: '12px 16px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534' }}>{success}</div> : null}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Link href="/welds" className="btn btn-secondary">
                        Hủy
                    </Link>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Đang tạo...' : `Tạo ${weldNumbers.length || 0} mối hàn`}
                    </button>
                </div>
            </form>
        </div>
    )
}
