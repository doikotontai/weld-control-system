'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error)
}

async function getAdminSupabase() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('weld-control-auth')?.value

    if (!accessToken) throw new Error('Not authenticated')

    const { data: { user } } = await supabase.auth.getUser(accessToken)
    if (!user) throw new Error('Not authenticated')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        throw new Error('Bạn không có quyền quản trị Dự án.')
    }

    return supabase
}

export async function createProject(formData: FormData) {
    try {
        const supabase = await getAdminSupabase()

        const code = formData.get('code') as string
        const name = formData.get('name') as string
        const client = formData.get('client') as string
        const contractor = formData.get('contractor') as string
        const location = formData.get('location') as string

        if (!code || !name) {
            return { error: 'Mã dự án và Tên dự án là bắt buộc', success: false }
        }

        const { error } = await supabase
            .from('projects')
            .insert({
                code,
                name,
                client,
                contractor,
                location
            })

        if (error) {
            // Unique constraint violation for code
            if (error.code === '23505') {
                return { error: 'Mã dự án này đã tồn tại!', success: false }
            }
            return { error: error.message, success: false }
        }

        revalidatePath('/admin')
        return { success: true }
    } catch (error: unknown) {
        return { error: getErrorMessage(error), success: false }
    }
}

export async function deleteProject(id: string) {
    try {
        const supabase = await getAdminSupabase()

        // Kiểm tra xem dự án có dữ liệu mối hàn/drawings/requests nào không trước khi xóa
        // Supabase có ON DELETE CASCADE, nhưng ta nên cẩn thận hoặc thông báo
        // Ở đây ta cứ làm thao tác xóa, nếu có lỗi (ví dụ restrict) sẽ bung ra
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id)

        if (error) {
            return { error: error.message, success: false }
        }

        revalidatePath('/admin')
        return { success: true }
    } catch (error: unknown) {
        return { error: getErrorMessage(error), success: false }
    }
}
