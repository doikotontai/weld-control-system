export type UserRole = 'admin' | 'dcc' | 'qc' | 'inspector' | 'viewer'

export type WeldStage =
    | 'fitup'
    | 'welding'
    | 'visual'
    | 'request'
    | 'backgouge'
    | 'lamcheck'
    | 'ndt'
    | 'release'
    | 'cutoff'
    | 'mw1'
    | 'completed'
    | 'rejected'

export type NDTResult = 'ACC' | 'REJ' | 'N/A' | null
export type FinalStatus = 'OK' | 'REPAIR' | 'REJECT' | null
export type RequestStatus = 'draft' | 'submitted' | 'scheduled' | 'completed' | 'cancelled'
export type NDTType = 'MT' | 'UT' | 'RT' | 'PT' | 'PWHT' | 'VISUAL' | 'FITUP' | 'BACKGOUGE' | 'LAMCHECK'
export type RequestType = 'fitup' | 'request' | 'backgouge' | 'lamcheck' | 'vs_final'

export interface Profile {
    id: string
    email: string
    full_name: string
    role: UserRole
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface Project {
    id: string
    code: string
    name: string
    client: string | null
    contractor: string | null
    location: string | null
    start_date: string | null
    end_date: string | null
    is_active: boolean
    created_at: string
}

export interface Drawing {
    id: string
    project_id: string
    drawing_no: string
    description: string | null
    part: string | null
    nde_pct: string | null
    total_welds: number
    created_at: string
}

export interface Weld {
    id: string
    project_id: string
    drawing_id: string | null
    weld_id: string
    weld_no: string
    drawing_no: string
    is_repair: boolean
    repair_no: number
    joint_family: string | null
    joint_type: string | null
    ndt_requirements: string | null
    position: string | null
    wps_no: string | null
    goc_code: string | null
    weld_length: number | null
    thickness: number | null
    thickness_lamcheck: number | null
    weld_size: string | null
    welders: string | null
    fitup_request_no: string | null
    fitup_inspector: string | null
    fitup_date: string | null
    weld_finish_date: string | null
    fitup_result: NDTResult
    visual_inspector: string | null
    visual_date: string | null
    inspection_request_no: string | null
    visual_result: NDTResult
    backgouge_date: string | null
    backgouge_request_no: string | null
    lamcheck_date: string | null
    lamcheck_request_no: string | null
    lamcheck_report_no: string | null
    overall_status: string | null
    ndt_overall_result: string | null
    mt_result: NDTResult
    mt_report_no: string | null
    ut_result: NDTResult
    ut_report_no: string | null
    rt_result: NDTResult
    rt_report_no: string | null
    pwht_result: NDTResult
    ndt_after_pwht: string | null
    defect_length: number | null
    repair_length: number | null
    release_final_date: string | null
    release_final_request_no: string | null
    release_note_date: string | null
    release_note_no: string | null
    cut_off: string | null
    note: string | null
    contractor_issue: string | null
    transmittal_no: string | null
    mw1_no: string | null
    stage: WeldStage
    final_status: FinalStatus
    remarks: string | null
    created_at: string
    updated_at: string
    created_by: string | null
    updated_by: string | null
    excel_row_order: number | null
}

export interface InspectionRequest {
    id: string
    project_id: string
    request_no: string
    request_type: RequestType
    item: string | null
    task_no: string | null
    requested_by: string | null
    inspector_company: string | null
    request_date: string | null
    request_time: string | null
    inspection_date: string | null
    inspection_time: string | null
    status: RequestStatus
    remarks: string | null
    inspection_methods?: {
        fitUp: boolean
        finalVisual: boolean
        mt: boolean
        pt: boolean
        ut: boolean
        rt: boolean
        other: boolean
        otherLabel: string
    } | null
    created_at: string
    updated_at: string
    created_by: string | null
    items?: RequestItem[]
}

export interface RequestItem {
    id: string
    request_id: string
    weld_id: string | null
    stt: number | null
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
}

export interface NDTResultRecord {
    id: string
    weld_id: string
    request_id: string | null
    ndt_type: NDTType
    result: 'PASS' | 'REPAIR' | 'REJECT' | 'ACC' | 'REJ' | 'N/A'
    report_no: string | null
    test_date: string | null
    technician: string | null
    company: string | null
    location: string | null
    defect_length: number | null
    remarks: string | null
    created_at: string
    created_by: string | null
}

export interface AuditLog {
    id: string
    table_name: string
    record_id: string
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    old_data: Record<string, unknown> | null
    new_data: Record<string, unknown> | null
    changed_by: string | null
    changed_at: string
}

export interface WeldStats {
    project_id: string
    project_code: string
    total_welds: number
    completed_welds: number
    repair_welds: number
    pending_welds: number
    total_repairs: number
    completion_percentage: number
}

export interface DrawingStats {
    drawing_id: string
    drawing_no: string
    part: string | null
    project_id: string
    total_welds: number
    completed: number
    repairs: number
    pending: number
}

export interface WeldFormData {
    weld_no: string
    drawing_no: string
    joint_type: string
    ndt_requirements: string
    wps_no: string
    goc_code: string
    weld_length: number | ''
    thickness: number | ''
    welders: string
    stage: WeldStage
    remarks: string
}

export interface InspectionRequestFormData {
    request_no: string
    request_type: RequestType
    item: string
    task_no: string
    requested_by: string
    inspector_company: string
    request_date: string
    request_time: string
    inspection_date: string
    inspection_time: string
    remarks: string
}

export interface NDTResultFormData {
    weld_id: string
    ndt_type: NDTType
    result: string
    report_no: string
    test_date: string
    technician: string
    company: string
    remarks: string
}

export interface WeldFilters {
    search?: string
    drawing_no?: string
    goc_code?: string
    joint_type?: string
    stage?: WeldStage | ''
    final_status?: FinalStatus | ''
    mt_result?: NDTResult | ''
    ut_result?: NDTResult | ''
    is_repair?: boolean | null
    page?: number
    limit?: number
}

export const STAGE_LABELS: Record<WeldStage, string> = {
    fitup: 'Fit-Up',
    welding: 'Welding',
    visual: 'Visual',
    request: 'Request',
    backgouge: 'Backgouge',
    lamcheck: 'Lamcheck',
    ndt: 'NDT',
    release: 'Release',
    cutoff: 'Cut-Off',
    mw1: 'MW1',
    completed: 'Hoàn thành',
    rejected: 'Bị từ chối',
}

export const STAGE_COLORS: Record<WeldStage, string> = {
    fitup: 'bg-blue-100 text-blue-800',
    welding: 'bg-amber-100 text-amber-800',
    visual: 'bg-violet-100 text-violet-800',
    request: 'bg-sky-100 text-sky-800',
    backgouge: 'bg-orange-100 text-orange-800',
    lamcheck: 'bg-emerald-100 text-emerald-800',
    ndt: 'bg-pink-100 text-pink-800',
    release: 'bg-green-100 text-green-800',
    cutoff: 'bg-slate-200 text-slate-800',
    mw1: 'bg-cyan-100 text-cyan-800',
    completed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
}

export const ROLE_LABELS: Record<UserRole, string> = {
    admin: 'Quản trị viên',
    dcc: 'DCC',
    qc: 'QC Engineer',
    inspector: 'Inspector',
    viewer: 'Chỉ xem',
}

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
    fitup: 'Fit-Up',
    request: 'REQUEST / NDT / KH Visual',
    backgouge: 'Backgouge',
    lamcheck: 'Lamcheck',
    vs_final: 'VS Final',
}

export const NDT_RESULT_COLORS = {
    ACC: 'bg-green-100 text-green-800',
    PASS: 'bg-green-100 text-green-800',
    REJ: 'bg-red-100 text-red-800',
    REJECT: 'bg-red-100 text-red-800',
    REPAIR: 'bg-yellow-100 text-yellow-800',
    'N/A': 'bg-gray-100 text-gray-600',
}
