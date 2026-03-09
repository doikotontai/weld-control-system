'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

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

export async function createInspectionRequest(formData: FormData) {
    try {
        const { supabase, user } = await getSupabaseWithAuth()

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'dcc', 'qc'].includes(profile.role)) {
            return {
                error: 'Ban khong co quyen tao yeu cau kiem tra.',
                success: false,
            }
        }

        const projectId = String(formData.get('project_id') || '').trim()
        const requestType = String(formData.get('request_type') || '').trim()
        const requestNo = String(formData.get('request_no') || '').trim().toUpperCase()
        let item = String(formData.get('item') || '').trim()
        const taskNo = String(formData.get('task_no') || '').trim() || null
        const requestedBy = String(formData.get('requested_by') || '').trim() || null
        const inspectorCompany = String(formData.get('inspector_company') || '').trim() || null
        const requestDate = String(formData.get('request_date') || '').trim()
        const requestTime = String(formData.get('request_time') || '').trim() || null
        const remarks = String(formData.get('remarks') || '').trim() || null
        const weldIdsJson = formData.get('weld_ids') as string | null

        if (!projectId || !requestType || !requestNo) {
            return {
                error: 'Vui long chon du an, loai request va nhap dung Request No.',
                success: false,
            }
        }

        let weldIds: string[] = []
        try {
            if (weldIdsJson) weldIds = JSON.parse(weldIdsJson)
        } catch (error) {
            console.error('Failed to parse weld_ids', error)
        }

        if (weldIds.length > 0 && !item) {
            const { data: weldsInfo } = await supabase
                .from('welds')
                .select('weld_no')
                .in('id', weldIds)

            if (weldsInfo?.length) {
                item = `DS moi han: ${weldsInfo.map((w) => w.weld_no).join(', ')}`
            }
        }

        const { data: existingRequest } = await supabase
            .from('inspection_requests')
            .select('id')
            .eq('project_id', projectId)
            .eq('request_no', requestNo)
            .maybeSingle()

        if (existingRequest) {
            return {
                error: `Request No ${requestNo} da ton tai trong du an nay.`,
                success: false,
            }
        }

        const { data, error } = await supabase
            .from('inspection_requests')
            .insert({
                project_id: projectId,
                request_no: requestNo,
                request_type: requestType,
                item: item || null,
                task_no: taskNo,
                requested_by: requestedBy,
                inspector_company: inspectorCompany,
                request_date: requestDate ? new Date(requestDate).toISOString() : null,
                request_time: requestTime,
                remarks,
                status: 'submitted',
                created_by: user.id,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating request:', error)
            return { error: error.message || 'Khong tao duoc request', success: false }
        }

        if (weldIds.length > 0) {
            const updateData: Record<string, string> = {}
            if (requestType === 'fitup') updateData.fitup_request_no = requestNo
            else if (requestType === 'backgouge') updateData.backgouge_request_no = requestNo
            else if (requestType === 'lamcheck') updateData.lamcheck_request_no = requestNo
            else if (requestType === 'request') updateData.inspection_request_no = requestNo

            if (Object.keys(updateData).length > 0) {
                const { error: updateWeldsError } = await supabase
                    .from('welds')
                    .update(updateData)
                    .in('id', weldIds)

                if (updateWeldsError) {
                    console.error('Failed to attach request number to welds:', updateWeldsError)
                }
            }
        }

        revalidatePath('/requests')
        revalidatePath(`/requests/${data.id}`)

        return { success: true, request_id: data.id }
    } catch (error) {
        console.error('Server action error:', error)
        return {
            error: error instanceof Error ? error.message : 'Loi he thong',
            success: false,
        }
    }
}

export async function updateRequestStatus(requestId: string, newStatus: string) {
    try {
        const { supabase, user } = await getSupabaseWithAuth()

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'qc'].includes(profile.role)) {
            return { error: 'Ban khong co quyen chuyen trang thai.', success: false }
        }

        const { error } = await supabase
            .from('inspection_requests')
            .update({ status: newStatus })
            .eq('id', requestId)

        if (error) {
            return { error: error.message, success: false }
        }

        revalidatePath('/requests')
        revalidatePath(`/requests/${requestId}`)
        return { success: true }
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : 'Loi he thong',
            success: false,
        }
    }
}
