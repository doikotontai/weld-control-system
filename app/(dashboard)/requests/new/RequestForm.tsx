'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    createInspectionRequest,
    deleteInspectionRequest,
    updateInspectionRequest,
} from '@/app/actions/requests'
import RequestPrintView from '@/app/(dashboard)/requests/[id]/RequestPrintView'
import SyncedTableFrame from '@/components/SyncedTableFrame'
import { createClient } from '@/lib/supabase/client'
import {
    createEmptyRequestMethods,
    inferRequestMethods,
    normalizeRequestMethods,
    REQUEST_PREFIX,
    REQUEST_TYPE_COLUMN,
    REQUEST_TYPE_LABELS,
    RequestMethodFlags,
    normalizeRequestNo,
} from '@/lib/request-config'
import { buildEditableRequestItem, EditableRequestItem } from '@/lib/request-items'
import { PROJECT_CHANGE_EVENT, readActiveProjectIdFromCookie } from '@/lib/project-selection'
import { RequestType } from '@/types'

interface Project {
    id: string
    code: string
    name: string
}

interface RequestRecord {
    id: string
    project_id: string
    request_no: string
    request_type: RequestType
    item: string | null
    task_no: string | null
    requested_by: string | null
    inspector_company: string | null
    request_date: string | null
    request_time: string | null
    inspection_date: string | null
    inspection_time: string | null
    remarks: string | null
    status?: string | null
    inspection_methods?: RequestMethodFlags | null
    projects?: { code?: string | null; name?: string | null } | null
}

interface RequestSearchWeld {
    id: string
    weld_id: string
    drawing_no: string
    weld_no: string
    joint_type: string | null
    welders: string | null
    wps_no: string | null
    weld_size: string | null
    ndt_requirements: string | null
    goc_code: string | null
    weld_finish_date: string | null
    position: string | null
    weld_length: number | null
    thickness: number | null
    remarks: string | null
    fitup_request_no?: string | null
    inspection_request_no?: string | null
    backgouge_request_no?: string | null
    lamcheck_request_no?: string | null
}

interface RequestFormProps {
    projects: Project[]
    userName: string
    mode?: 'create' | 'edit'
    initialRequest?: RequestRecord | null
    initialItems?: EditableRequestItem[]
    initialMethods?: RequestMethodFlags | null
}

type RequestFormState = {
    project_id: string
    request_type: RequestType | ''
    request_no: string
    item: string
    task_no: string
    requested_by: string
    inspector_company: string
    request_date: string
    request_time: string
    inspection_date: string
    inspection_time: string
    remarks: string
}

type LookupColumn = 'fitup_request_no' | 'inspection_request_no' | 'backgouge_request_no' | 'lamcheck_request_no'

const LOOKUP_TYPE_BY_PREFIX: Array<{ prefix: string; type: Exclude<RequestType, 'vs_final'> }> = [
    { prefix: 'F-', type: 'fitup' },
    { prefix: 'BG-', type: 'backgouge' },
    { prefix: 'UL-', type: 'lamcheck' },
    { prefix: 'V-', type: 'request' },
]

const BASE_WELD_SELECT = [
    'id',
    'weld_id',
    'drawing_no',
    'weld_no',
    'joint_type',
    'welders',
    'wps_no',
    'weld_size',
    'ndt_requirements',
    'goc_code',
    'weld_finish_date',
    'position',
    'weld_length',
    'thickness',
    'remarks',
]

const labelStyle = {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '4px',
    display: 'block' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
}

const METHOD_EDITOR_CONFIG: Array<{
    key: Exclude<keyof RequestMethodFlags, 'otherLabel'>
    label: string
    hint: string
}> = [
    { key: 'fitUp', label: 'Fit-Up', hint: 'Mối ghép' },
    { key: 'finalVisual', label: 'Final Visual', hint: 'Visual khách hàng' },
    { key: 'mt', label: 'MT', hint: 'Bột từ' },
    { key: 'pt', label: 'PT', hint: 'Thẩm thấu' },
    { key: 'ut', label: 'UT', hint: 'Siêu âm' },
    { key: 'rt', label: 'RT', hint: 'Chụp phim' },
    { key: 'other', label: 'Khác', hint: 'PAUT / PMI / ...' },
]

function toDateInput(value: string | null | undefined) {
    return value ? String(value).slice(0, 10) : ''
}

function mapWeldsToItems(welds: RequestSearchWeld[]) {
    return welds.map((weld) => buildEditableRequestItem(weld))
}

function inferRequestTypeFromNumber(requestNo: string): Exclude<RequestType, 'vs_final'> | null {
    const normalized = normalizeRequestNo(requestNo)
    const match = LOOKUP_TYPE_BY_PREFIX.find((item) => normalized.startsWith(item.prefix))
    return match?.type || null
}

function resolveLookupColumns(requestType: RequestType | '', requestNo: string): LookupColumn[] {
    if (requestType && requestType !== 'vs_final') {
        return [REQUEST_TYPE_COLUMN[requestType] as LookupColumn]
    }

    const inferredType = inferRequestTypeFromNumber(requestNo)
    if (inferredType) {
        return [REQUEST_TYPE_COLUMN[inferredType] as LookupColumn]
    }

    return Object.values(REQUEST_TYPE_COLUMN) as LookupColumn[]
}

function matchesExactRequestNumber(weld: RequestSearchWeld, requestNo: string, columns: LookupColumn[]) {
    const normalized = normalizeRequestNo(requestNo)
    return columns.some((column) => normalizeRequestNo(String(weld[column] || '')) === normalized)
}

function buildLookupSelect(columns: LookupColumn[]) {
    return [...BASE_WELD_SELECT, ...columns]
        .filter((value, index, array) => array.indexOf(value) === index)
        .join(', ')
}

function buildLookupOrClause(columns: LookupColumn[], requestNo: string) {
    return columns.map((column) => `${column}.ilike.${requestNo}`).join(',')
}

function makeEmptyForm(initialRequest?: RequestRecord | null, userName?: string): RequestFormState {
    return {
        project_id: initialRequest?.project_id || '',
        request_type: initialRequest?.request_type || '',
        request_no: initialRequest?.request_no || '',
        item: initialRequest?.item || '',
        task_no: initialRequest?.task_no || '',
        requested_by: initialRequest?.requested_by || userName || '',
        inspector_company: initialRequest?.inspector_company || '',
        request_date: toDateInput(initialRequest?.request_date),
        request_time: initialRequest?.request_time || '',
        inspection_date: toDateInput(initialRequest?.inspection_date),
        inspection_time: initialRequest?.inspection_time || '',
        remarks: initialRequest?.remarks || '',
    }
}

function makeInitialMethods(
    mode: 'create' | 'edit',
    requestType: RequestType | '' | undefined,
    initialItems: EditableRequestItem[],
    initialMethods?: RequestMethodFlags | null
) {
    if (initialMethods) {
        return normalizeRequestMethods(initialMethods, requestType || undefined)
    }

    if (mode === 'edit' && requestType) {
        return inferRequestMethods(
            requestType,
            initialItems.map((item) => ({ ndt_requirements: item.inspection_required }))
        )
    }

    return createEmptyRequestMethods(requestType || undefined)
}

function SelectedTag({ count, label }: { count: number; label: string }) {
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>{count}</span>
            <span>{label}</span>
        </div>
    )
}

export default function RequestForm({
    projects,
    userName,
    mode = 'create',
    initialRequest = null,
    initialItems = [],
    initialMethods = null,
}: RequestFormProps) {
    const router = useRouter()
    const supabase = createClient()
    const [form, setForm] = useState<RequestFormState>(() => makeEmptyForm(initialRequest, userName))
    const [methods, setMethods] = useState<RequestMethodFlags>(() =>
        makeInitialMethods(mode, initialRequest?.request_type, initialItems, initialMethods)
    )
    const [selectedItems, setSelectedItems] = useState<EditableRequestItem[]>(initialItems)
    const [lookupResults, setLookupResults] = useState<EditableRequestItem[]>([])
    const [searchResults, setSearchResults] = useState<EditableRequestItem[]>([])
    const [lookupLoading, setLookupLoading] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const previousProjectIdRef = useRef(form.project_id)

    useEffect(() => {
        if (mode === 'edit' || typeof window === 'undefined') {
            return
        }

        const syncProject = () => {
            const projectId = readActiveProjectIdFromCookie() || ''
            if (previousProjectIdRef.current !== projectId) {
                previousProjectIdRef.current = projectId
                setLookupResults([])
                setSearchResults([])
                setSearchTerm('')
                setSelectedItems([])
                setError('')
                setSuccess('')
            }
            setForm((current) => (current.project_id === projectId ? current : { ...current, project_id: projectId }))
        }

        syncProject()
        window.addEventListener(PROJECT_CHANGE_EVENT, syncProject)
        return () => window.removeEventListener(PROJECT_CHANGE_EVENT, syncProject)
    }, [mode])

    const setField = (key: keyof RequestFormState, value: string) => {
        setForm((current) => ({ ...current, [key]: value }))
    }

    const updateProjectId = (projectId: string) => {
        if (previousProjectIdRef.current !== projectId) {
            previousProjectIdRef.current = projectId
            setLookupResults([])
            setSearchResults([])
            setSearchTerm('')
            setSelectedItems([])
            setError('')
            setSuccess('')
        }

        setField('project_id', projectId)
    }

    const selectedIds = useMemo(() => new Set(selectedItems.map((item) => item.weldId).filter(Boolean)), [selectedItems])
    const currentProject = useMemo(() => projects.find((project) => project.id === form.project_id) || null, [form.project_id, projects])
    const suggestedMethods = useMemo(
        () =>
            inferRequestMethods(
                (form.request_type || 'request') as RequestType,
                selectedItems.map((item) => ({ ndt_requirements: item.inspection_required }))
            ),
        [form.request_type, selectedItems]
    )

    const toggleMethod = (key: Exclude<keyof RequestMethodFlags, 'otherLabel'>) => {
        setMethods((current) => {
            if (form.request_type === 'fitup' && key === 'fitUp') {
                return { ...current, fitUp: true }
            }

            return { ...current, [key]: !current[key] }
        })
    }

    const applySuggestedMethods = () => {
        setMethods((current) => ({
            ...suggestedMethods,
            fitUp: form.request_type === 'fitup' ? true : suggestedMethods.fitUp,
            otherLabel: current.other && current.otherLabel ? current.otherLabel : suggestedMethods.otherLabel,
        }))
    }

    const addItems = (items: EditableRequestItem[]) => {
        setSelectedItems((current) => {
            const next = [...current]
            items.forEach((item) => {
                if (!item.weldId || next.some((existing) => existing.weldId === item.weldId)) return
                next.push(item)
            })
            return next
        })
    }

    const removeItem = (weldId: string) => {
        setSelectedItems((current) => current.filter((item) => item.weldId !== weldId))
    }

    const updateItemRemarks = (weldId: string, remarks: string) => {
        setSelectedItems((current) => current.map((item) => (item.weldId === weldId ? { ...item, remarks } : item)))
    }

    const lookupByRequestNumber = useCallback(async () => {
        const requestNo = normalizeRequestNo(form.request_no)

        if (!form.project_id || !requestNo) {
            setError('Vui lòng chọn dự án và nhập số request cần tra cứu.')
            return
        }

        if (form.request_type === 'vs_final') {
            setError('VS Final hiện không tra cứu theo số request kiểu REQUEST.')
            return
        }

        const columns = resolveLookupColumns(form.request_type, requestNo)
        const inferredType = inferRequestTypeFromNumber(requestNo)

        setLookupLoading(true)
        setError('')
        setSuccess('')
        setForm((current) => ({
            ...current,
            request_no: requestNo,
            request_type: current.request_type || inferredType || current.request_type,
        }))

        const { data, error: queryError } = await supabase
            .from('welds')
            .select(buildLookupSelect(columns))
            .eq('project_id', form.project_id)
            .or(buildLookupOrClause(columns, requestNo))
            .order('excel_row_order', { ascending: true })

        if (queryError) {
            setLookupResults([])
            setError(`Lỗi tra cứu request: ${queryError.message}`)
            setLookupLoading(false)
            return
        }

        const exactMatches = ((data || []) as RequestSearchWeld[]).filter((weld) => matchesExactRequestNumber(weld, requestNo, columns))
        setLookupResults(mapWeldsToItems(exactMatches))

        if (exactMatches.length === 0) {
            setError(`Không tìm thấy mối hàn nào có request ${requestNo} trong dự án đang chọn.`)
        }

        setLookupLoading(false)
    }, [form.project_id, form.request_no, form.request_type, supabase])

    const searchAnyWeld = useCallback(async () => {
        const keyword = searchTerm.trim()
        if (!form.project_id) {
            setError('Vui lòng chọn dự án trước khi tìm mối hàn.')
            return
        }

        if (!keyword) {
            setSearchResults([])
            return
        }

        setSearchLoading(true)
        setError('')
        setSuccess('')

        const { data, error: queryError } = await supabase
            .from('welds')
            .select(buildLookupSelect(resolveLookupColumns('', keyword)))
            .eq('project_id', form.project_id)
            .or(`weld_id.ilike.%${keyword}%,drawing_no.ilike.%${keyword}%,weld_no.ilike.%${keyword}%,inspection_request_no.ilike.%${keyword}%,fitup_request_no.ilike.%${keyword}%,backgouge_request_no.ilike.%${keyword}%,lamcheck_request_no.ilike.%${keyword}%`)
            .order('excel_row_order', { ascending: true })
            .limit(80)

        if (queryError) {
            setSearchResults([])
            setError(`Lỗi tìm mối hàn: ${queryError.message}`)
            setSearchLoading(false)
            return
        }

        setSearchResults(mapWeldsToItems((data || []) as RequestSearchWeld[]))
        setSearchLoading(false)
    }, [form.project_id, searchTerm, supabase])

    const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSaving(true)
        setError('')
        setSuccess('')

        const formData = new FormData()
        Object.entries(form).forEach(([key, value]) => formData.set(key, value))
        formData.set('request_no', normalizeRequestNo(form.request_no))
        formData.set('inspection_methods_json', JSON.stringify(methods))
        formData.set('selected_items_json', JSON.stringify(selectedItems))

        const result = mode === 'edit' && initialRequest
            ? await updateInspectionRequest(initialRequest.id, formData)
            : await createInspectionRequest(formData)

        if (!result.success) {
            setError(result.error || 'Không lưu được request.')
            setSaving(false)
            return
        }

        setSuccess(mode === 'edit' ? 'Đã cập nhật request.' : 'Đã tạo request.')
        router.push(`/requests/${result.request_id}`)
        router.refresh()
    }

    const handleDelete = async () => {
        if (!initialRequest || mode !== 'edit') return
        if (!window.confirm(`Xóa request ${initialRequest.request_no}?`)) return

        setDeleting(true)
        const result = await deleteInspectionRequest(initialRequest.id)
        if (!result.success) {
            setError(result.error || 'Không xóa được request.')
            setDeleting(false)
            return
        }

        router.push('/requests')
        router.refresh()
    }

    const previewRequest: RequestRecord = {
        id: initialRequest?.id || 'preview',
        project_id: form.project_id,
        request_no: normalizeRequestNo(form.request_no),
        request_type: (form.request_type || 'request') as RequestType,
        item: form.item || null,
        task_no: form.task_no || null,
        requested_by: form.requested_by || null,
        inspector_company: form.inspector_company || null,
        request_date: form.request_date || null,
        request_time: form.request_time || null,
        inspection_date: form.inspection_date || null,
        inspection_time: form.inspection_time || null,
        remarks: form.remarks || null,
        inspection_methods: methods,
        projects: currentProject ? { code: currentProject.code, name: currentProject.name } : initialRequest?.projects || null,
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {(error || success) && <div style={{ padding: '12px 16px', background: error ? '#fee2e2' : '#dcfce7', color: error ? '#b91c1c' : '#166534', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500 }}>{error || success}</div>}
            <form onSubmit={submitForm} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontWeight: 700, color: '#1e40af', fontSize: '1rem' }}>{mode === 'edit' ? 'Sửa yêu cầu kiểm tra' : 'Tạo yêu cầu kiểm tra'}</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <SelectedTag count={selectedItems.length} label="mối hàn đã chọn" />
                            {mode === 'edit' ? <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Đang xóa...' : 'Xóa request'}</button> : null}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                        <div>
                            <label style={labelStyle}>Dự án *</label>
                            <select className="form-input" value={form.project_id} onChange={(event) => updateProjectId(event.target.value)}>
                                <option value="">-- Chọn dự án --</option>
                                {projects.map((project) => <option key={project.id} value={project.id}>{project.code} - {project.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Loại request *</label>
                            <select className="form-input" value={form.request_type} onChange={(event) => {
                                const nextType = event.target.value as RequestType | ''
                                setField('request_type', nextType)
                                setMethods((current) => normalizeRequestMethods({
                                    ...current,
                                    fitUp: nextType === 'fitup' ? true : current.fitUp,
                                    finalVisual: nextType === 'vs_final' ? true : current.finalVisual,
                                }, nextType || undefined))
                                if (nextType && nextType !== 'vs_final' && !form.request_no.trim()) {
                                    setField('request_no', REQUEST_PREFIX[nextType] || '')
                                }
                                setLookupResults([])
                            }}>
                                <option value="">-- Chọn loại --</option>
                                {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Số request *</label>
                            <input className="form-input" value={form.request_no} onChange={(event) => setField('request_no', event.target.value)} placeholder={form.request_type && form.request_type !== 'vs_final' ? `${REQUEST_PREFIX[form.request_type]}001` : 'V-001'} />
                        </div>
                        <div>
                            <label style={labelStyle}>Ngày yêu cầu *</label>
                            <input className="form-input" type="date" value={form.request_date} onChange={(event) => setField('request_date', event.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Giờ yêu cầu</label>
                            <input className="form-input" type="time" value={form.request_time} onChange={(event) => setField('request_time', event.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Ngày inspection</label>
                            <input className="form-input" type="date" value={form.inspection_date} onChange={(event) => setField('inspection_date', event.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Giờ inspection</label>
                            <input className="form-input" type="time" value={form.inspection_time} onChange={(event) => setField('inspection_time', event.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Người yêu cầu</label>
                            <input className="form-input" value={form.requested_by} onChange={(event) => setField('requested_by', event.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Đơn vị NDT / kiểm tra</label>
                            <input className="form-input" value={form.inspector_company} onChange={(event) => setField('inspector_company', event.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Hạng mục</label>
                            <input className="form-input" value={form.item} onChange={(event) => setField('item', event.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Task No. / NVXS</label>
                            <input className="form-input" value={form.task_no} onChange={(event) => setField('task_no', event.target.value)} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Ghi chú</label>
                            <textarea className="form-input" rows={3} value={form.remarks} onChange={(event) => setField('remarks', event.target.value)} style={{ resize: 'vertical' }} />
                        </div>
                    </div>
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <div>
                            <h3 style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.95rem', marginBottom: '4px' }}>Phương pháp / nội dung kiểm tra</h3>
                            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                                Có thể tick đồng thời 2 hoặc 3 phương pháp trên cùng một request.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={applySuggestedMethods}
                            disabled={selectedItems.length === 0}
                        >
                            Gợi ý từ mối hàn đã chọn
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    {METHOD_EDITOR_CONFIG.map((method) => (
                                        <th
                                            key={method.key}
                                            style={{
                                                border: '1px solid #cbd5e1',
                                                background: '#f8fafc',
                                                padding: '10px 8px',
                                                textAlign: 'center',
                                            }}
                                        >
                                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{method.label}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>{method.hint}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {METHOD_EDITOR_CONFIG.map((method) => (
                                        <td
                                            key={method.key}
                                            style={{ border: '1px solid #cbd5e1', padding: '12px 8px', textAlign: 'center' }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={methods[method.key]}
                                                disabled={method.key === 'fitUp' && form.request_type === 'fitup'}
                                                onChange={() => toggleMethod(method.key)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'minmax(220px, 360px) 1fr', gap: '12px' }}>
                        <div>
                            <label style={labelStyle}>Nội dung khác</label>
                            <input
                                className="form-input"
                                value={methods.otherLabel}
                                onChange={(event) =>
                                    setMethods((current) => ({
                                        ...current,
                                        other: event.target.value.trim().length > 0 || current.other,
                                        otherLabel: event.target.value,
                                    }))
                                }
                                placeholder="Ví dụ: PAUT, PMI..."
                            />
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', alignSelf: 'end' }}>
                            Bản in request sẽ lấy đúng các ô đã tick ở đây. Nếu muốn theo dữ liệu mối hàn, dùng nút “Gợi ý từ mối hàn đã chọn”.
                        </div>
                    </div>
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '8px', color: '#1e40af', fontSize: '0.95rem' }}>Tra cứu theo số request đã gắn trên mối hàn</h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '12px' }}>Giữ nguyên logic Excel: tra theo request number ở cột tương ứng rồi thêm vào phiếu. Sau đó vẫn có thể bổ sung hoặc xóa thủ công từng mối hàn.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'end' }}>
                        <div>
                            <label style={labelStyle}>Nhập số request để tra</label>
                            <input className="form-input" value={form.request_no} onChange={(event) => setField('request_no', event.target.value)} onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault()
                                    void lookupByRequestNumber()
                                }
                            }} placeholder="Ví dụ: V-154" />
                        </div>
                        <button type="button" className="btn btn-secondary" onClick={() => void lookupByRequestNumber()} disabled={lookupLoading}>{lookupLoading ? 'Đang tra...' : 'Tra theo request'}</button>
                        <button type="button" className="btn btn-primary" onClick={() => addItems(lookupResults)} disabled={lookupResults.length === 0}>Thêm tất cả kết quả</button>
                    </div>
                    {lookupResults.length > 0 ? (
                        <div style={{ marginTop: '14px' }}>
                            <SyncedTableFrame>
                                <table style={{ minWidth: '1120px', fontSize: '0.8rem' }}>
                                    <thead><tr><th>#</th><th>Weld ID</th><th>Drawing</th><th>Weld No</th><th>Type</th><th>Welders</th><th>WPS</th><th>Weld Size</th><th>Inspection Required</th><th>GOC</th><th>Thao tác</th></tr></thead>
                                    <tbody>
                                        {lookupResults.map((item, index) => (
                                            <tr key={`lookup-${item.weldId}`}>
                                                <td>{index + 1}</td><td style={{ fontWeight: 700, color: '#1d4ed8' }}>{item.weld_id}</td><td>{item.drawing_no}</td><td>{item.weld_no}</td><td>{item.weld_type}</td><td>{item.welder_no}</td><td>{item.wps}</td><td>{item.weld_size}</td><td>{item.inspection_required}</td><td>{item.goc_code}</td>
                                                <td><button type="button" className="btn btn-secondary" onClick={() => addItems([item])} disabled={selectedIds.has(item.weldId)}>{selectedIds.has(item.weldId) ? 'Đã thêm' : 'Thêm'}</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </SyncedTableFrame>
                        </div>
                    ) : null}
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '8px', color: '#1e40af', fontSize: '0.95rem' }}>Thêm thủ công mối hàn bất kỳ trong dự án</h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '12px' }}>Dùng khi cần chèn thêm vài mối hàn ngoài nhóm tra cứu theo request number.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'end' }}>
                        <div>
                            <label style={labelStyle}>Tìm theo Weld ID / Drawing / Weld No / Request</label>
                            <input className="form-input" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault()
                                    void searchAnyWeld()
                                }
                            }} placeholder="Ví dụ: WM32, DS-0032, V-154, BG-043..." />
                        </div>
                        <button type="button" className="btn btn-secondary" onClick={() => void searchAnyWeld()} disabled={searchLoading}>{searchLoading ? 'Đang tìm...' : 'Tìm mối hàn'}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setSearchResults([])}>Xóa kết quả</button>
                    </div>
                    {searchResults.length > 0 ? (
                        <div style={{ marginTop: '14px' }}>
                            <SyncedTableFrame>
                                <table style={{ minWidth: '1120px', fontSize: '0.8rem' }}>
                                    <thead><tr><th>#</th><th>Weld ID</th><th>Drawing</th><th>Weld No</th><th>Type</th><th>Welders</th><th>WPS</th><th>Weld Size</th><th>Inspection Required</th><th>GOC</th><th>Thao tác</th></tr></thead>
                                    <tbody>
                                        {searchResults.map((item, index) => (
                                            <tr key={`search-${item.weldId}`}>
                                                <td>{index + 1}</td><td style={{ fontWeight: 700, color: '#1d4ed8' }}>{item.weld_id}</td><td>{item.drawing_no}</td><td>{item.weld_no}</td><td>{item.weld_type}</td><td>{item.welder_no}</td><td>{item.wps}</td><td>{item.weld_size}</td><td>{item.inspection_required}</td><td>{item.goc_code}</td>
                                                <td><button type="button" className="btn btn-secondary" onClick={() => addItems([item])} disabled={selectedIds.has(item.weldId)}>{selectedIds.has(item.weldId) ? 'Đã thêm' : 'Thêm'}</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </SyncedTableFrame>
                        </div>
                    ) : null}
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.95rem' }}>Danh sách mối hàn trong request</h3>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{selectedItems.length} dòng</span>
                    </div>
                    <SyncedTableFrame>
                        <table style={{ minWidth: '1260px', fontSize: '0.8rem' }}>
                            <thead><tr><th>STT</th><th>Weld ID</th><th>Drawing</th><th>Weld No</th><th>Type</th><th>Welder No.</th><th>WPS</th><th>Weld Size</th><th>Inspection Required</th><th>GOC Code</th><th>Finish Date</th><th>Remarks</th><th>Thao tác</th></tr></thead>
                            <tbody>
                                {selectedItems.length === 0 ? (
                                    <tr><td colSpan={13} style={{ textAlign: 'center', color: '#64748b', padding: '22px' }}>Chưa có mối hàn nào trong request.</td></tr>
                                ) : selectedItems.map((item, index) => (
                                    <tr key={`selected-${item.weldId}`}>
                                        <td>{index + 1}</td><td style={{ fontWeight: 700, color: '#1d4ed8' }}>{item.weld_id}</td><td>{item.drawing_no}</td><td>{item.weld_no}</td><td>{item.weld_type}</td><td>{item.welder_no}</td><td>{item.wps}</td><td>{item.weld_size}</td><td>{item.inspection_required}</td><td>{item.goc_code}</td><td>{item.finish_date || '-'}</td>
                                        <td style={{ minWidth: '160px' }}><input className="form-input" value={item.remarks} onChange={(event) => updateItemRemarks(item.weldId, event.target.value)} placeholder="Ghi chú riêng trên phiếu" /></td>
                                        <td><button type="button" className="btn btn-danger" onClick={() => removeItem(item.weldId)}>Xóa</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </SyncedTableFrame>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => router.push('/requests')}>Hủy</button>
                    <button type="submit" className="btn btn-primary" disabled={saving || selectedItems.length === 0}>{saving ? 'Đang lưu...' : mode === 'edit' ? `Lưu thay đổi (${selectedItems.length} mối hàn)` : `Tạo request (${selectedItems.length} mối hàn)`}</button>
                </div>
            </form>

            {mode === 'edit' ? <RequestPrintView request={previewRequest} items={selectedItems} /> : null}
        </div>
    )
}
