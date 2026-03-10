'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { EditableRequestItem } from '@/lib/request-items'
import { REQUEST_TYPE_COLUMN, normalizeRequestNo } from '@/lib/request-config'
import { RequestType } from '@/types'

type ActionResult = {
    success: boolean
    error?: string
    request_id?: string
}

type RequestRecord = {
    id: string
    project_id: string
    request_no: string
    request_type: RequestType
}

type RequestItemRecord = {
    weld_id: string | null
}

type WeldLookupRow = {
    id: string
}

async function getSupabaseWithAuth() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('weld-control-auth')?.value

    if (!accessToken) {
        throw new Error('Not authenticated')
    }

    const {
        data: { user },
    } = await supabase.auth.getUser(accessToken)

    if (!user) {
        throw new Error('Not authenticated')
    }

    return { supabase, user }
}

async function requireRequestManagerRole() {
    const { supabase, user } = await getSupabaseWithAuth()

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['admin', 'dcc', 'qc'].includes(profile.role)) {
        throw new Error('Bạn không có quyền quản lý yêu cầu kiểm tra.')
    }

    return { supabase, user }
}

function parseSelectedItems(formData: FormData): EditableRequestItem[] {
    const raw = String(formData.get('selected_items_json') || '[]')

    try {
        const parsed = JSON.parse(raw) as EditableRequestItem[]
        return Array.isArray(parsed)
            ? parsed.filter((item) => item && (item.weldId || item.weld_id || item.drawing_no || item.weld_no))
            : []
    } catch {
        return []
    }
}

function getRequestColumn(requestType: RequestType) {
    if (requestType === 'vs_final') {
        return null
    }
    return REQUEST_TYPE_COLUMN[requestType]
}

async function getRequestWeldIds(supabase: Awaited<ReturnType<typeof createClient>>, request: RequestRecord) {
    const { data: items } = await supabase
        .from('request_items')
        .select('weld_id')
        .eq('request_id', request.id)
        .order('stt', { ascending: true })

    const weldIds = ((items as RequestItemRecord[] | null) || [])
        .map((item) => item.weld_id)
        .filter((value): value is string => Boolean(value))

    if (weldIds.length > 0) {
        return weldIds
    }

    const column = getRequestColumn(request.request_type)
    if (!column) {
        return []
    }

    const { data: welds } = await supabase
        .from('welds')
        .select('id')
        .eq('project_id', request.project_id)
        .eq(column, request.request_no)

    return ((welds as WeldLookupRow[] | null) || []).map((weld) => weld.id)
}

async function syncRequestRefs(
    supabase: Awaited<ReturnType<typeof createClient>>,
    current: { requestType: RequestType; requestNo: string; weldIds: string[] },
    previous?: { requestType: RequestType; requestNo: string; weldIds: string[] }
) {
    const previousColumn = previous ? getRequestColumn(previous.requestType) : null
    const currentColumn = getRequestColumn(current.requestType)

    if (previousColumn && previous?.weldIds.length) {
        const clearPayload: Record<string, null> = { [previousColumn]: null }
        await supabase
            .from('welds')
            .update(clearPayload)
            .in('id', previous.weldIds)
            .eq(previousColumn, previous.requestNo)
    }

    if (currentColumn && current.weldIds.length) {
        const setPayload: Record<string, string> = { [currentColumn]: current.requestNo }
        await supabase
            .from('welds')
            .update(setPayload)
            .in('id', current.weldIds)
    }
}

async function replaceRequestItems(
    supabase: Awaited<ReturnType<typeof createClient>>,
    requestId: string,
    items: EditableRequestItem[]
) {
    await supabase.from('request_items').delete().eq('request_id', requestId)

    if (items.length === 0) {
        return
    }

    const payload = items.map((item, index) => ({
        request_id: requestId,
        weld_id: item.weldId || null,
        stt: index + 1,
        drawing_no: item.drawing_no || null,
        weld_no: item.weld_no || null,
        weld_type: item.weld_type || null,
        welder_no: item.welder_no || null,
        wps: item.wps || null,
        weld_size: item.weld_size || null,
        inspection_required: item.inspection_required || null,
        goc_code: item.goc_code || null,
        finish_date: item.finish_date || null,
        remarks: item.remarks || null,
    }))

    const { error } = await supabase.from('request_items').insert(payload)
    if (error) {
        throw new Error(error.message)
    }
}

function readRequestPayload(formData: FormData) {
    return {
        projectId: String(formData.get('project_id') || '').trim(),
        requestType: String(formData.get('request_type') || '').trim() as RequestType,
        requestNo: normalizeRequestNo(String(formData.get('request_no') || '')),
        item: String(formData.get('item') || '').trim() || null,
        taskNo: String(formData.get('task_no') || '').trim() || null,
        requestedBy: String(formData.get('requested_by') || '').trim() || null,
        inspectorCompany: String(formData.get('inspector_company') || '').trim() || null,
        requestDate: String(formData.get('request_date') || '').trim(),
        requestTime: String(formData.get('request_time') || '').trim() || null,
        inspectionDate: String(formData.get('inspection_date') || '').trim(),
        inspectionTime: String(formData.get('inspection_time') || '').trim() || null,
        remarks: String(formData.get('remarks') || '').trim() || null,
        selectedItems: parseSelectedItems(formData),
    }
}

function validateRequestPayload(payload: ReturnType<typeof readRequestPayload>) {
    if (!payload.projectId || !payload.requestType || !payload.requestNo) {
        return 'Vui lòng chọn dự án, loại request và nhập đúng Request No.'
    }

    if (payload.selectedItems.length === 0) {
        return 'Request phải có ít nhất một mối hàn.'
    }

    return null
}

function revalidateRequestPages(requestId: string) {
    revalidatePath('/requests')
    revalidatePath('/requests/new')
    revalidatePath(`/requests/${requestId}`)
}

export async function createInspectionRequest(formData: FormData): Promise<ActionResult> {
    try {
        const { supabase, user } = await requireRequestManagerRole()
        const payload = readRequestPayload(formData)
        const validationError = validateRequestPayload(payload)

        if (validationError) {
            return { success: false, error: validationError }
        }

        const { data: existingRequest } = await supabase
            .from('inspection_requests')
            .select('id')
            .eq('project_id', payload.projectId)
            .eq('request_no', payload.requestNo)
            .maybeSingle()

        if (existingRequest) {
            return {
                success: false,
                error: `Request No ${payload.requestNo} đã tồn tại trong dự án này.`,
            }
        }

        const { data, error } = await supabase
            .from('inspection_requests')
            .insert({
                project_id: payload.projectId,
                request_no: payload.requestNo,
                request_type: payload.requestType,
                item: payload.item,
                task_no: payload.taskNo,
                requested_by: payload.requestedBy,
                inspector_company: payload.inspectorCompany,
                request_date: payload.requestDate ? new Date(payload.requestDate).toISOString() : null,
                request_time: payload.requestTime,
                inspection_date: payload.inspectionDate ? new Date(payload.inspectionDate).toISOString() : null,
                inspection_time: payload.inspectionTime,
                remarks: payload.remarks,
                status: 'submitted',
                created_by: user.id,
            })
            .select()
            .single()

        if (error || !data) {
            return { success: false, error: error?.message || 'Không tạo được request.' }
        }

        await replaceRequestItems(supabase, data.id, payload.selectedItems)
        await syncRequestRefs(
            supabase,
            {
                requestType: payload.requestType,
                requestNo: payload.requestNo,
                weldIds: payload.selectedItems.map((item) => item.weldId).filter(Boolean),
            }
        )

        revalidateRequestPages(data.id)
        return { success: true, request_id: data.id }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Lỗi hệ thống',
        }
    }
}

export async function updateInspectionRequest(requestId: string, formData: FormData): Promise<ActionResult> {
    try {
        const { supabase } = await requireRequestManagerRole()
        const payload = readRequestPayload(formData)
        const validationError = validateRequestPayload(payload)

        if (validationError) {
            return { success: false, error: validationError }
        }

        const { data: currentRequest } = await supabase
            .from('inspection_requests')
            .select('id, project_id, request_no, request_type')
            .eq('id', requestId)
            .single()

        if (!currentRequest) {
            return { success: false, error: 'Không tìm thấy request cần sửa.' }
        }

        const { data: duplicateRequest } = await supabase
            .from('inspection_requests')
            .select('id')
            .eq('project_id', payload.projectId)
            .eq('request_no', payload.requestNo)
            .neq('id', requestId)
            .maybeSingle()

        if (duplicateRequest) {
            return {
                success: false,
                error: `Request No ${payload.requestNo} đã tồn tại trong dự án này.`,
            }
        }

        const previous = currentRequest as RequestRecord
        const previousWeldIds = await getRequestWeldIds(supabase, previous)

        const { error } = await supabase
            .from('inspection_requests')
            .update({
                project_id: payload.projectId,
                request_no: payload.requestNo,
                request_type: payload.requestType,
                item: payload.item,
                task_no: payload.taskNo,
                requested_by: payload.requestedBy,
                inspector_company: payload.inspectorCompany,
                request_date: payload.requestDate ? new Date(payload.requestDate).toISOString() : null,
                request_time: payload.requestTime,
                inspection_date: payload.inspectionDate ? new Date(payload.inspectionDate).toISOString() : null,
                inspection_time: payload.inspectionTime,
                remarks: payload.remarks,
            })
            .eq('id', requestId)

        if (error) {
            return { success: false, error: error.message }
        }

        await replaceRequestItems(supabase, requestId, payload.selectedItems)
        await syncRequestRefs(
            supabase,
            {
                requestType: payload.requestType,
                requestNo: payload.requestNo,
                weldIds: payload.selectedItems.map((item) => item.weldId).filter(Boolean),
            },
            {
                requestType: previous.request_type,
                requestNo: previous.request_no,
                weldIds: previousWeldIds,
            }
        )

        revalidateRequestPages(requestId)
        return { success: true, request_id: requestId }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Lỗi hệ thống',
        }
    }
}

export async function deleteInspectionRequest(requestId: string): Promise<ActionResult> {
    try {
        const { supabase } = await requireRequestManagerRole()

        const { data: currentRequest } = await supabase
            .from('inspection_requests')
            .select('id, project_id, request_no, request_type')
            .eq('id', requestId)
            .single()

        if (!currentRequest) {
            return { success: false, error: 'Không tìm thấy request để xóa.' }
        }

        const previous = currentRequest as RequestRecord
        const previousWeldIds = await getRequestWeldIds(supabase, previous)

        await syncRequestRefs(
            supabase,
            {
                requestType: previous.request_type,
                requestNo: previous.request_no,
                weldIds: [],
            },
            {
                requestType: previous.request_type,
                requestNo: previous.request_no,
                weldIds: previousWeldIds,
            }
        )

        await supabase.from('request_items').delete().eq('request_id', requestId)

        const { error } = await supabase.from('inspection_requests').delete().eq('id', requestId)
        if (error) {
            return { success: false, error: error.message }
        }

        revalidatePath('/requests')
        revalidatePath(`/requests/${requestId}`)
        return { success: true }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Lỗi hệ thống',
        }
    }
}

export async function updateRequestStatus(requestId: string, newStatus: string): Promise<ActionResult> {
    try {
        const { supabase } = await requireRequestManagerRole()

        const { error } = await supabase
            .from('inspection_requests')
            .update({ status: newStatus })
            .eq('id', requestId)

        if (error) {
            return { success: false, error: error.message }
        }

        revalidateRequestPages(requestId)
        return { success: true, request_id: requestId }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Lỗi hệ thống',
        }
    }
}

