'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// Hàm lấy token từ cookie thay vì phụ thuộc vào thư viện mặc định
async function getSupabaseWithAuth() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('weld-control-auth')?.value

    if (!accessToken) {
        throw new Error('Not authenticated')
    }

    const { data: { user } } = await supabase.auth.getUser(accessToken)
    if (!user) {
        throw new Error('Not authenticated')
    }

    return { supabase, user }
}

export async function createInspectionRequest(formData: FormData) {
    try {
        const { supabase, user } = await getSupabaseWithAuth()

        // Lấy profile để kiểm tra quyền
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'dcc', 'qc'].includes(profile.role)) {
            return {
                error: 'Bạn không có quyền tạo Yêu cầu kiểm tra. Vui lòng liên hệ Admin.',
                success: false
            }
        }

        const projectId = formData.get('project_id')
        const requestType = formData.get('request_type')
        let item = String(formData.get('item') || '').trim()
        const taskNo = formData.get('task_no')
        const requestedBy = formData.get('requested_by')
        const inspectorCompany = formData.get('inspector_company')
        const requestDate = formData.get('request_date')
        const requestTime = formData.get('request_time')
        const remarks = formData.get('remarks')
        const weldIdsJson = formData.get('weld_ids') as string | null

        if (!projectId || !requestType) {
            return { error: 'Vui lòng chọn Dự án và Loại yêu cầu.', success: false }
        }

        let weldIds: string[] = []
        try {
            if (weldIdsJson) weldIds = JSON.parse(weldIdsJson)
        } catch (e) {
            console.error('Lỗi parse weld_ids:', e)
        }

        // Tự động sinh tên Hạng mục (Item) dựa vào danh sách các mối hàn đã chọn nếu người dùng không nhập
        if (weldIds.length > 0) {
            const { data: weldsInfo } = await supabase.from('welds').select('weld_no').in('id', weldIds)
            if (weldsInfo && weldsInfo.length > 0) {
                const weldNosString = weldsInfo.map(w => w.weld_no).join(', ')
                if (!item) {
                    item = `DS Mối hàn: ${weldNosString}`
                }
            }
        }

        // Tạo số Request No tự động theo logic (VD: loại-timestamp)
        const timestamp = new Date().getTime().toString().slice(-6)
        const typePrefix = String(requestType).toUpperCase().substring(0, 3)
        const requestNo = `REQ-${typePrefix}-${timestamp}`

        const { data, error } = await supabase
            .from('inspection_requests')
            .insert({
                project_id: projectId,
                request_no: requestNo,
                request_type: requestType,
                item: item,
                task_no: taskNo,
                requested_by: requestedBy,
                inspector_company: inspectorCompany,
                request_date: requestDate ? new Date(String(requestDate)).toISOString() : null,
                request_time: requestTime,
                remarks: remarks,
                status: 'submitted',
                created_by: user.id
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating request:', error)
            return { error: error.message || 'Có lỗi xảy ra khi tạo Yêu cầu', success: false }
        }

        // Cập nhật mã Yêu cầu vào các Mối hàn tương ứng
        if (weldIds.length > 0) {
            let updateData: any = {}
            if (requestType === 'fitup') updateData.fitup_request_no = requestNo
            else if (requestType === 'backgouge') updateData.backgouge_request_no = requestNo
            else if (requestType === 'lamcheck') updateData.lamcheck_request_no = requestNo
            else if (requestType === 'mpi') updateData.mt_report_no = requestNo

            if (Object.keys(updateData).length > 0) {
                const { error: updateWeldsError } = await supabase.from('welds').update(updateData).in('id', weldIds)
                if (updateWeldsError) {
                    console.error('Lỗi khi gắn mã Request vào các mối hàn:', updateWeldsError)
                }
            }
        }

        revalidatePath('/requests')
        return { success: true, request_id: data.id }
    } catch (e: any) {
        console.error('Sever action error:', e)
        return { error: e.message || 'Lỗi hệ thống', success: false }
    }
}

export async function updateRequestStatus(requestId: string, newStatus: string) {
    try {
        const { supabase, user } = await getSupabaseWithAuth()

        // Kiểm tra quyền (Chỉ admin, qc mới được đổi status)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'qc'].includes(profile.role)) {
            return { error: 'Bạn không có quyền chuyển trạng thái.', success: false }
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
    } catch (e: any) {
        return { error: e.message, success: false }
    }
}
