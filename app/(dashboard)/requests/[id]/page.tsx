import { requireDashboardAuth } from '@/lib/dashboard-auth'
import RequestPrintView from './RequestPrintView'

export const dynamic = 'force-dynamic'

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { supabase } = await requireDashboardAuth(['admin', 'dcc', 'qc'])
    const resolvedParams = await params
    const id = resolvedParams.id

    const { data: request } = await supabase
        .from('inspection_requests')
        .select('*, projects(code, name)')
        .eq('id', id)
        .single()

    if (!request) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Không tìm thấy yêu cầu này.</div>
    }

    let columnToMatch = ''
    if (request.request_type === 'fitup') columnToMatch = 'fitup_request_no'
    else if (request.request_type === 'backgouge') columnToMatch = 'backgouge_request_no'
    else if (request.request_type === 'lamcheck') columnToMatch = 'lamcheck_request_no'
    else if (request.request_type === 'request') columnToMatch = 'inspection_request_no'

    let matchedWelds = []
    if (columnToMatch) {
        const { data: welds } = await supabase
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
