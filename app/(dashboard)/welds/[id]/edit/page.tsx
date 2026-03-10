'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deriveWeldWorkflow } from '@/lib/weld-workflow'
import { STAGE_LABELS } from '@/types'
import { useRoleGuard } from '@/lib/use-role-guard'

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
    ndt_overall_result: string | null
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
    overall_status: string | null
    stage: string | null
    final_status: string | null
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

type FieldType = 'text' | 'number' | 'date' | 'select' | 'textarea'

interface FieldConfig {
    key: keyof WeldRecord | string
    label: string
    type?: FieldType
    placeholder?: string
    options?: { value: string; label: string }[]
    fullWidth?: boolean
    rows?: number
}

const RESULT_OPTIONS = [
    { value: '', label: '-- Chưa có --' },
    { value: 'ACC', label: 'ACC (Chấp nhận)' },
    { value: 'REJ', label: 'REJ (Từ chối)' },
    { value: 'N/A', label: 'N/A' },
]

const OVERALL_NDT_OPTIONS = [
    { value: '', label: '-- Chưa có --' },
    { value: 'ACC', label: 'ACC (Hoàn thành)' },
    { value: 'REJ', label: 'REJ (Reject)' },
]

const JOINT_TYPE_OPTIONS = ['', 'DB', 'DV', 'SB', 'SV', 'X1', 'X2', 'X3'].map((value) => ({
    value,
    label: value || '-- Chọn --',
}))

const EMPTY_FORM: FormData = {
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
    ndt_overall_result: '',
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
    remarks: '',
}

const BASIC_FIELDS: FieldConfig[] = [
    { key: 'weld_id', label: 'Weld ID', placeholder: '9001-2211-DS-0032-01-WM1' },
    { key: 'drawing_no', label: 'Drawing No', placeholder: '9001-2211-DS-0032-01-WM' },
    { key: 'weld_no', label: 'Weld No', placeholder: '1 / 17R1 / 127A' },
    { key: 'joint_family', label: 'Weld Joints', placeholder: 'X1, X2, X3...' },
    { key: 'joint_type', label: 'Weld Type', type: 'select', options: JOINT_TYPE_OPTIONS },
    { key: 'ndt_requirements', label: 'NDT requirements', placeholder: '100%MT & UT' },
    { key: 'position', label: 'OD / L (Position)', placeholder: 'D / L' },
    { key: 'weld_length', label: 'Length (mm)', type: 'number', placeholder: '2392.68' },
    { key: 'thickness', label: 'Thickness (mm)', type: 'number', placeholder: '25' },
    { key: 'thickness_lamcheck', label: 'Độ dày LC', type: 'number', placeholder: '25' },
    { key: 'wps_no', label: 'WPS No.', placeholder: 'WPS-TNHA-S06' },
    { key: 'goc_code', label: 'GOC Code', placeholder: 'ST-22' },
    { key: 'welders', label: 'Thợ hàn (Welders)', placeholder: 'BGT-0005;BGT-0015;GTC-12', fullWidth: true },
]

const FITUP_FIELDS: FieldConfig[] = [
    { key: 'fitup_inspector', label: 'QC Fit-Up', placeholder: 'Nguyễn Văn A' },
    { key: 'fitup_date', label: 'Ngày Fit-Up', type: 'date' },
    { key: 'fitup_request_no', label: 'Request Fit-Up', placeholder: 'F-044' },
    { key: 'weld_finish_date', label: 'Ngày hoàn thành hàn', type: 'date' },
]

const VISUAL_FIELDS: FieldConfig[] = [
    { key: 'visual_inspector', label: 'QC Visual', placeholder: 'Nguyễn Văn A' },
    { key: 'visual_date', label: 'Ngày Visual', type: 'date' },
    { key: 'inspection_request_no', label: 'RQ mời NDT / khách hàng', placeholder: 'V-065' },
    { key: 'backgouge_date', label: 'Ngày Backgouge', type: 'date' },
    { key: 'backgouge_request_no', label: 'Request Backgouge', placeholder: 'BG-043' },
]

const NDT_FIELDS: FieldConfig[] = [
    { key: 'lamcheck_date', label: 'Ngày Lamcheck', type: 'date' },
    { key: 'lamcheck_request_no', label: 'Request Lamcheck', placeholder: 'UL-001' },
    { key: 'lamcheck_report_no', label: 'Báo cáo Lamcheck', placeholder: 'LC-001' },
    { key: 'ndt_overall_result', label: 'Kết quả NDT tổng (cột Z)', type: 'select', options: OVERALL_NDT_OPTIONS },
    { key: 'mt_result', label: 'Kết quả MT', type: 'select', options: RESULT_OPTIONS },
    { key: 'mt_report_no', label: 'Báo cáo MT', placeholder: 'MT-2211-ST-22-0017' },
    { key: 'ut_result', label: 'Kết quả UT', type: 'select', options: RESULT_OPTIONS },
    { key: 'ut_report_no', label: 'Báo cáo UT', placeholder: 'UT-2211-ST-22-0033' },
    { key: 'rt_result', label: 'Kết quả RT', type: 'select', options: RESULT_OPTIONS },
    { key: 'rt_report_no', label: 'Báo cáo RT', placeholder: 'RT-...' },
    { key: 'pwht_result', label: 'Kết quả PWHT', type: 'select', options: RESULT_OPTIONS },
    { key: 'defect_length', label: 'Chiều dài khuyết tật (mm)', type: 'number', placeholder: '0' },
    { key: 'repair_length', label: 'Chiều dài sửa chữa (mm)', type: 'number', placeholder: '0' },
]

const RELEASE_FIELDS: FieldConfig[] = [
    { key: 'release_final_date', label: 'Ngày release final', type: 'date' },
    { key: 'release_final_request_no', label: 'RQ release final', placeholder: 'FINAL-V-141' },
    { key: 'release_note_no', label: 'Release note / IRN', placeholder: 'IRN-2211-ST-22-0001' },
    { key: 'release_note_date', label: 'Ngày release note', type: 'date' },
    { key: 'ndt_after_pwht', label: 'NDT after PWHT', placeholder: 'MT / UT / RT' },
    { key: 'cut_off', label: 'Cut Off', placeholder: 'Cut-off ref' },
    { key: 'mw1_no', label: 'MW1', placeholder: 'MW1-...' },
    { key: 'transmittal_no', label: 'Transmittal No', placeholder: 'TR-...' },
    { key: 'contractor_issue', label: 'Contractor Issue', placeholder: 'Contractor issue' },
    { key: 'note', label: 'Ghi chú release / close-out', type: 'textarea', rows: 2, placeholder: 'Ghi chú close-out / release...', fullWidth: true },
    { key: 'remarks', label: 'Ghi chú thêm', type: 'textarea', rows: 3, placeholder: 'Ghi chú thêm...', fullWidth: true },
]

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

function SectionCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
    return (
        <div
            style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
        >
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
                <span>{icon}</span>
                <span>{title}</span>
            </h3>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '14px',
                }}
            >
                {children}
            </div>
        </div>
    )
}

function toDateString(value: unknown) {
    return value ? String(value).slice(0, 10) : ''
}

function toText(value: unknown) {
    return value == null ? '' : String(value)
}

function toNumberText(value: number | null) {
    return value == null ? '' : String(value)
}

function parseFloatOrNull(value: string) {
    return value ? parseFloat(value) : null
}

function parseIntOrNull(value: string) {
    return value ? parseInt(value, 10) : null
}

function renderField(field: FieldConfig, value: string, onChange: (value: string) => void) {
    if (field.type === 'textarea') {
        return (
            <textarea
                className="form-input"
                rows={field.rows || 3}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={field.placeholder}
                style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
            />
        )
    }

    if (field.type === 'select') {
        return (
            <select
                className="form-input"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
            >
                {(field.options || []).map((option) => (
                    <option key={option.value || '__empty'} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        )
    }

    return (
        <input
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            className="form-input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
            style={{ width: '100%', boxSizing: 'border-box' }}
        />
    )
}

function FieldGrid({
    fields,
    form,
    setField,
}: {
    fields: FieldConfig[]
    form: FormData
    setField: (key: string, value: string) => void
}) {
    return (
        <>
            {fields.map((field) => (
                <div key={field.key} style={field.fullWidth ? { gridColumn: '1 / -1' } : undefined}>
                    <Label>{field.label}</Label>
                    {renderField(field, form[field.key] || '', (value) => setField(field.key, value))}
                </div>
            ))}
        </>
    )
}

function SummaryItem({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
    const colors: Record<typeof tone, { bg: string; text: string; border: string }> = {
        neutral: { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' },
        good: { bg: '#ecfdf5', text: '#166534', border: '#bbf7d0' },
        warn: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
        bad: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    }

    return (
        <div
            style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: `1px solid ${colors[tone].border}`,
                background: colors[tone].bg,
            }}
        >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
            </div>
            <div style={{ marginTop: '6px', fontSize: '0.95rem', fontWeight: 700, color: colors[tone].text }}>{value}</div>
        </div>
    )
}

export default function EditWeldPage() {
    const supabase = createClient()
    const router = useRouter()
    const { checking: checkingRole } = useRoleGuard(['admin', 'dcc', 'qc'])
    const params = useParams()
    const id = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [weldDisplayId, setWeldDisplayId] = useState('')
    const [form, setForm] = useState<FormData>(EMPTY_FORM)

    const workflow = useMemo(
        () =>
            deriveWeldWorkflow({
                weldNo: form.weld_no,
                fitupDate: form.fitup_date,
                visualDate: form.visual_date,
                ndtRequirements: form.ndt_requirements,
                ndtOverallResult: form.ndt_overall_result,
                mtResult: form.mt_result,
                utResult: form.ut_result,
                rtResult: form.rt_result,
                pwhtResult: form.pwht_result,
                inspectionRequestNo: form.inspection_request_no,
                backgougeDate: form.backgouge_date,
                backgougeRequestNo: form.backgouge_request_no,
                lamcheckDate: form.lamcheck_date,
                lamcheckRequestNo: form.lamcheck_request_no,
                lamcheckReportNo: form.lamcheck_report_no,
                releaseFinalDate: form.release_final_date,
                releaseFinalRequestNo: form.release_final_request_no,
                releaseNoteDate: form.release_note_date,
                releaseNoteNo: form.release_note_no,
                cutOff: form.cut_off,
                mw1No: form.mw1_no,
            }),
        [form]
    )

    const setField = (key: string, value: string) => {
        setForm((current) => ({ ...current, [key]: value }))
    }

    useEffect(() => {
        async function load() {
            const { data, error: loadError } = await supabase.from('welds').select('*').eq('id', id).single()

            if (loadError || !data) {
                setError('Không tìm thấy mối hàn.')
                setLoading(false)
                return
            }

            const weld = data as unknown as WeldRecord
            setWeldDisplayId(toText(weld.weld_id))
            setForm({
                weld_id: toText(weld.weld_id),
                drawing_no: toText(weld.drawing_no),
                weld_no: toText(weld.weld_no),
                joint_family: toText(weld.joint_family),
                joint_type: toText(weld.joint_type),
                ndt_requirements: toText(weld.ndt_requirements),
                position: toText(weld.position),
                weld_length: toNumberText(weld.weld_length),
                thickness: toNumberText(weld.thickness),
                thickness_lamcheck: toNumberText(weld.thickness_lamcheck),
                wps_no: toText(weld.wps_no),
                goc_code: toText(weld.goc_code),
                fitup_inspector: toText(weld.fitup_inspector),
                fitup_date: toDateString(weld.fitup_date),
                fitup_request_no: toText(weld.fitup_request_no),
                weld_finish_date: toDateString(weld.weld_finish_date),
                welders: toText(weld.welders),
                visual_inspector: toText(weld.visual_inspector),
                visual_date: toDateString(weld.visual_date),
                inspection_request_no: toText(weld.inspection_request_no),
                backgouge_date: toDateString(weld.backgouge_date),
                backgouge_request_no: toText(weld.backgouge_request_no),
                ndt_overall_result: toText(weld.ndt_overall_result),
                mt_result: toText(weld.mt_result),
                mt_report_no: toText(weld.mt_report_no),
                ut_result: toText(weld.ut_result),
                ut_report_no: toText(weld.ut_report_no),
                rt_result: toText(weld.rt_result),
                rt_report_no: toText(weld.rt_report_no),
                lamcheck_date: toDateString(weld.lamcheck_date),
                lamcheck_request_no: toText(weld.lamcheck_request_no),
                lamcheck_report_no: toText(weld.lamcheck_report_no),
                release_final_date: toDateString(weld.release_final_date),
                release_final_request_no: toText(weld.release_final_request_no),
                release_note_no: toText(weld.release_note_no),
                release_note_date: toDateString(weld.release_note_date),
                pwht_result: toText(weld.pwht_result),
                ndt_after_pwht: toText(weld.ndt_after_pwht),
                defect_length: toNumberText(weld.defect_length),
                repair_length: toNumberText(weld.repair_length),
                cut_off: toText(weld.cut_off),
                note: toText(weld.note),
                contractor_issue: toText(weld.contractor_issue),
                transmittal_no: toText(weld.transmittal_no),
                mw1_no: toText(weld.mw1_no),
                remarks: toText(weld.remarks),
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
            weld_length: parseFloatOrNull(form.weld_length),
            thickness: parseIntOrNull(form.thickness),
            thickness_lamcheck: parseFloatOrNull(form.thickness_lamcheck),
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
            ndt_overall_result: form.ndt_overall_result || null,
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
            defect_length: parseFloatOrNull(form.defect_length),
            repair_length: parseFloatOrNull(form.repair_length),
            cut_off: form.cut_off || null,
            note: form.note || null,
            contractor_issue: form.contractor_issue || null,
            transmittal_no: form.transmittal_no || null,
            mw1_no: form.mw1_no || null,
            overall_status: workflow.overallStatus,
            stage: workflow.stage,
            final_status: workflow.finalStatus,
            remarks: form.remarks || null,
        }

        const weldTable = supabase.from('welds') as unknown as WeldUpdateTable
        const { error: updateError } = await weldTable.update(updateData).eq('id', id)

        if (updateError) {
            setError(`Lỗi lưu: ${updateError.message}`)
        } else {
            setSuccess('Đã lưu thành công.')
            setTimeout(() => setSuccess(''), 3000)
        }

        setSaving(false)
    }

    async function handleDelete() {
        setDeleting(true)
        const weldTable = supabase.from('welds') as unknown as WeldUpdateTable
        const { error: deleteError } = await weldTable.delete().eq('id', id)

        if (deleteError) {
            setError(`Lỗi xóa: ${deleteError.message}`)
            setDeleting(false)
            return
        }

        router.push('/welds')
    }

    if (checkingRole) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Đang kiểm tra quyền truy cập...
            </div>
        )
    }

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '80px' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#64748b' }}>Đang tải...</p>
            </div>
        )
    }

    const stageLabel = STAGE_LABELS[workflow.stage] || workflow.stage
    const overallTone =
        workflow.overallStatus === 'FINISH'
            ? 'good'
            : workflow.overallStatus === 'REJ' || workflow.overallStatus === 'DELETE'
              ? 'bad'
              : 'warn'

    return (
        <div className="page-enter">
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '20px',
                }}
            >
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Sửa mối hàn</h1>
                    <p
                        style={{
                            color: '#64748b',
                            marginTop: '4px',
                            fontFamily: 'monospace',
                            fontSize: '0.95rem',
                        }}
                    >
                        {weldDisplayId}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href="/welds" className="btn btn-secondary">
                        Danh sách
                    </Link>

                    {!confirmDelete ? (
                        <button
                            className="btn"
                            onClick={() => setConfirmDelete(true)}
                            style={{
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                            }}
                        >
                            Xóa
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span
                                style={{
                                    color: '#dc2626',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                }}
                            >
                                Xác nhận xóa?
                            </span>
                            <button
                                className="btn"
                                onClick={handleDelete}
                                disabled={deleting}
                                style={{
                                    background: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                }}
                            >
                                {deleting ? 'Đang xóa...' : 'Xóa'}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setConfirmDelete(false)}
                            >
                                Hủy
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {error ? (
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
            ) : null}
            {success ? (
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
            ) : null}

            <div
                style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    marginBottom: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
            >
                <div style={{ marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                        Workflow tự động theo Excel
                    </h2>
                    <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.9rem' }}>
                        Trạng thái được suy ra theo thứ tự của cột Y: Fit-Up → Visual → NDT tổng
                        (cột Z). Nhập ACC ở cột Z sẽ không thể vượt qua bước Fit-Up hoặc Visual còn
                        thiếu.
                    </p>
                </div>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '12px',
                    }}
                >
                    <SummaryItem
                        label="Status cột Y"
                        value={workflow.overallStatus}
                        tone={overallTone}
                    />
                    <SummaryItem label="Stage hệ thống" value={stageLabel} />
                    <SummaryItem
                        label="Kết luận cuối"
                        value={workflow.finalStatus || '-'}
                        tone={workflow.finalStatus === 'OK' ? 'good' : workflow.finalStatus === 'REJECT' ? 'bad' : 'neutral'}
                    />
                </div>
            </div>

            <form onSubmit={handleSave}>
                <SectionCard icon="INFO" title="Thông tin cơ bản">
                    <FieldGrid fields={BASIC_FIELDS} form={form} setField={setField} />
                </SectionCard>

                <SectionCard icon="FIT" title="Fit-Up / Hoàn thành hàn">
                    <FieldGrid fields={FITUP_FIELDS} form={form} setField={setField} />
                </SectionCard>

                <SectionCard icon="VIS" title="Visual / Request / Backgouge">
                    <FieldGrid fields={VISUAL_FIELDS} form={form} setField={setField} />
                </SectionCard>

                <SectionCard icon="NDT" title="Lamcheck / Kết quả NDT">
                    <FieldGrid fields={NDT_FIELDS} form={form} setField={setField} />
                </SectionCard>

                <SectionCard icon="REL" title="Release / Hoàn công">
                    <FieldGrid fields={RELEASE_FIELDS} form={form} setField={setField} />
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
                    <Link href="/welds" className="btn btn-secondary">
                        Hủy
                    </Link>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </form>
        </div>
    )
}
