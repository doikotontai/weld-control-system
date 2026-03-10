import { requireDashboardAuth } from '@/lib/dashboard-auth'
import { REQUEST_TYPE_COLUMN } from '@/lib/request-config'
import { buildEditableRequestItem, EditableRequestItem } from '@/lib/request-items'
import RequestForm from '../new/RequestForm'

export const dynamic = 'force-dynamic'

interface RequestItemRow {
    weld_id: string | null
    drawing_no: string | null
    weld_no: string | null
    weld_type: string | null
    welder_no: string | null
    wps: string | null
    weld_size: string | null
    inspection_required: string | null
    goc_code: string | null
    finish_date: string | null
    remarks: string | null
    welds?: Array<{
        id: string
        weld_id: string | null
        drawing_no: string | null
        weld_no: string | null
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
    }> | null
}

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { supabase, fullName, user } = await requireDashboardAuth(['admin', 'dcc', 'qc'])
    const { id } = await params

    const [{ data: request }, { data: projects }] = await Promise.all([
        supabase
            .from('inspection_requests')
            .select('*, projects(code, name)')
            .eq('id', id)
            .single(),
        supabase.from('projects').select('id, code, name').order('created_at', { ascending: false }),
    ])

    if (!request) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Không tìm thấy yêu cầu này.</div>
    }

    const { data: requestItems } = await supabase
        .from('request_items')
        .select(`
            weld_id,
            drawing_no,
            weld_no,
            weld_type,
            welder_no,
            wps,
            weld_size,
            inspection_required,
            goc_code,
            finish_date,
            remarks,
            welds (
                id,
                weld_id,
                drawing_no,
                weld_no,
                joint_type,
                welders,
                wps_no,
                weld_size,
                ndt_requirements,
                goc_code,
                weld_finish_date,
                position,
                weld_length,
                thickness,
                remarks
            )
        `)
        .eq('request_id', id)
        .order('stt', { ascending: true })

    let initialItems: EditableRequestItem[] = []

    if ((requestItems || []).length > 0) {
        initialItems = (requestItems as RequestItemRow[]).map((item) => {
            const weld = item.welds?.[0]

            if (weld?.id) {
                return buildEditableRequestItem(weld, {
                    remarks: item.remarks || '',
                })
            }

            return {
                weldId: '',
                weld_id: item.weld_id || '',
                drawing_no: item.drawing_no || '',
                weld_no: item.weld_no || '',
                weld_type: item.weld_type || '',
                welder_no: item.welder_no || '',
                wps: item.wps || '',
                weld_size: item.weld_size || '',
                inspection_required: item.inspection_required || '',
                goc_code: item.goc_code || '',
                finish_date: item.finish_date || '',
                remarks: item.remarks || '',
            }
        })
    } else if (request.request_type !== 'vs_final') {
        const column = REQUEST_TYPE_COLUMN[request.request_type as keyof typeof REQUEST_TYPE_COLUMN]
        const { data: welds } = await supabase
            .from('welds')
            .select('id, weld_id, drawing_no, weld_no, joint_type, welders, wps_no, weld_size, ndt_requirements, goc_code, weld_finish_date, position, weld_length, thickness, remarks')
            .eq('project_id', request.project_id)
            .eq(column, request.request_no)
            .order('excel_row_order', { ascending: true })

        initialItems = (welds || []).map((weld) => buildEditableRequestItem(weld))
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b', marginBottom: '24px' }}>
                Chi tiết yêu cầu kiểm tra
            </h1>
            <RequestForm
                projects={projects || []}
                userName={fullName || user.email || ''}
                mode="edit"
                initialRequest={request}
                initialItems={initialItems}
            />
        </div>
    )
}
