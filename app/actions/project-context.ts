'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function setActiveProject(projectId: string) {
    const cookieStore = await cookies()
    if (projectId) {
        cookieStore.set('weld-control-project-id', projectId, {
            httpOnly: false, // Để client đọc được nếu cần
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30 // 30 days
        })
    } else {
        cookieStore.delete('weld-control-project-id')
    }

    // Yêu cầu Next.js nạp lại toàn bộ layout để cập nhật context
    revalidatePath('/', 'layout')
    return { success: true }
}
