'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { buildDrawingSyncRows } from '@/lib/drawing-registry'

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error)
}

async function requireManagedDrawingRole() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('weld-control-auth')?.value

    if (!accessToken) {
        throw new Error('Chưa đăng nhập.')
    }

    const {
        data: { user },
    } = await supabase.auth.getUser(accessToken)

    if (!user) {
        throw new Error('Chưa đăng nhập.')
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role as string | undefined

    if (!role || !['admin', 'dcc', 'qc'].includes(role)) {
        throw new Error('Bạn không có quyền cập nhật Drawing Map.')
    }

    return { userId: user.id, role }
}

export async function syncProjectDrawings(projectId: string) {
    try {
        await requireManagedDrawingRole()
        const adminClient = createAdminClient()

        const { data: weldRows, error: weldError } = await adminClient
            .from('welds')
            .select('drawing_no')
            .eq('project_id', projectId)

        if (weldError) {
            return { success: false, error: weldError.message }
        }

        const syncRows = buildDrawingSyncRows(
            projectId,
            (weldRows || []) as Array<{
                drawing_no: string | null
            }>
        )

        if (syncRows.length > 0) {
            const { error: upsertError } = await adminClient
                .from('drawings')
                .upsert(syncRows, { onConflict: 'project_id,drawing_no' })

            if (upsertError) {
                return { success: false, error: upsertError.message }
            }
        }

        revalidatePath('/drawings')
        revalidatePath('/reports/summary')
        return { success: true, count: syncRows.length }
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
    }
}

export async function updateDrawingMetadata(
    drawingId: string,
    values: { description?: string; part?: string; nde_pct?: string }
) {
    try {
        await requireManagedDrawingRole()
        const adminClient = createAdminClient()

        const payload = {
            description: values.description?.trim() || null,
            part: values.part?.trim() || null,
            nde_pct: values.nde_pct?.trim() || null,
        }

        const { error } = await adminClient.from('drawings').update(payload).eq('id', drawingId)

        if (error) {
            return { success: false, error: error.message }
        }

        revalidatePath('/drawings')
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
    }
}
