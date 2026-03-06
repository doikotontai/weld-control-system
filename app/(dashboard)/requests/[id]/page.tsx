import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RequestPrintView from './RequestPrintView'

export const dynamic = 'force-dynamic'

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const resolvedParams = await params
    const id = resolvedParams.id

    // Fetch request
    const { data: request } = await supabase
        .from('inspection_requests')
        .select('*, projects(code, name)')
        .eq('id', id)
        .single()

    if (!request) return <div style={{ padding: '40px', textAlign: 'center' }}>Không tìm thấy Yêu cầu này.</div>

    // Xác định cột để tìm kiếm danh sách mối hàn đã được assign request_no
    let columnToMatch = ''
    if (request.request_type === 'fitup') columnToMatch = 'fitup_request_no'
    else if (request.request_type === 'backgouge') columnToMatch = 'backgouge_request_no'
    else if (request.request_type === 'lamcheck') columnToMatch = 'lamcheck_request_no'
    else if (request.request_type === 'mpi') columnToMatch = 'mt_report_no'
    else if (request.request_type === 'visual' || request.request_type === 'final_visual') columnToMatch = 'visual_request_no'

    let matchedWelds = []
    if (columnToMatch) {
        const { data: welds, error } = await supabase
            .from('welds')
            .select('*')
            .eq('project_id', request.project_id)
            .eq(columnToMatch, request.request_no)
            .order('excel_row_order', { ascending: true })

        if (welds) {
            matchedWelds = welds
        }
    }

    return <RequestPrintView request={request} welds={matchedWelds} />
}
