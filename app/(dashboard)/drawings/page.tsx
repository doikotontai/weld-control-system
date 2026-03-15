import DrawingsRegistryClient from '@/app/(dashboard)/drawings/DrawingsRegistryClient'
import { requireDashboardAuth } from '@/lib/dashboard-auth'
import { buildDrawingRegistryRows } from '@/lib/drawing-registry'
import { fetchAllBatches } from '@/lib/fetch-all-batches'

export const dynamic = 'force-dynamic'

type DrawingViewRow = {
    id?: string
    project_id: string
    drawing_no: string
    description: string | null
    part: string | null
    nde_pct: string | null
    total_welds: number
    fitup_done: number
    visual_done: number
    ndt_done: number
    release_done: number
    goc_codes: string
    release_notes: string
    latest_release_note_date: string | null
    transmittal_numbers: string
    cut_off_refs: string
    mw1_numbers: string
    created_at?: string
}

export default async function DrawingsPage() {
    const { supabase, cookieStore, role } = await requireDashboardAuth(['admin', 'dcc', 'qc', 'viewer'])
    const projectId = cookieStore.get('weld-control-project-id')?.value || null

    let rows: DrawingViewRow[] = []

    if (projectId) {
        const [{ data: drawingRows }, weldRows] = await Promise.all([
            supabase
                .from('drawings')
                .select('id, project_id, drawing_no, description, part, nde_pct, total_welds, created_at')
                .eq('project_id', projectId)
                .order('drawing_no', { ascending: true }),
            fetchAllBatches({
                fetchPage: async (from, to) => {
                    const { data, error } = await supabase
                        .from('welds')
                        .select(
                            'drawing_no, goc_code, fitup_date, visual_date, mt_result, ut_result, rt_result, release_note_no, release_note_date, transmittal_no, cut_off, mw1_no'
                        )
                        .eq('project_id', projectId)
                        .order('drawing_no', { ascending: true })
                        .range(from, to)

                    if (error) {
                        throw new Error(error.message)
                    }

                    return (data || []) as Array<{
                        drawing_no: string | null
                        goc_code: string | null
                        fitup_date: string | null
                        visual_date: string | null
                        mt_result: string | null
                        ut_result: string | null
                        rt_result: string | null
                        release_note_no: string | null
                        release_note_date: string | null
                        transmittal_no: string | null
                        cut_off: string | null
                        mw1_no: string | null
                    }>
                },
            }),
        ])

        rows = buildDrawingRegistryRows(
            (drawingRows || []) as Array<{
                id?: string
                project_id: string
                drawing_no: string
                description: string | null
                part: string | null
                nde_pct: string | null
                total_welds: number
                created_at?: string
            }>,
            weldRows
        )
    }

    const totalDrawings = rows.length
    const totalWelds = rows.reduce((sum, row) => sum + row.total_welds, 0)

    return (
        <div className="page-enter">
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
                    Bản vẽ (Drawing Map)
                </h1>
                <p style={{ color: '#64748b', marginTop: 4, fontSize: '0.875rem' }}>
                    Tương ứng sheet <strong>list WMap</strong> -{' '}
                    {projectId
                        ? `${totalDrawings} bản vẽ | ${totalWelds.toLocaleString()} mối hàn`
                        : 'Chọn dự án để xem'}
                </p>
            </div>

            {!projectId ? (
                <div
                    style={{
                        padding: 40,
                        textAlign: 'center',
                        background: 'white',
                        borderRadius: 12,
                        color: '#64748b',
                    }}
                >
                    Vui lòng chọn dự án ở menu bên trái.
                </div>
            ) : rows.length === 0 ? (
                <div
                    style={{
                        padding: 40,
                        textAlign: 'center',
                        background: 'white',
                        borderRadius: 12,
                        color: '#64748b',
                    }}
                >
                    Chưa có dữ liệu bản vẽ. Hãy import file Excel trước.
                </div>
            ) : (
                <DrawingsRegistryClient
                    initialRows={rows}
                    projectId={projectId}
                    canEdit={['admin', 'dcc', 'qc'].includes(role)}
                />
            )}
        </div>
    )
}
