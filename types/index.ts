// types/index.ts
// TypeScript type definitions cho Weld Control System

export type UserRole = 'admin' | 'dcc' | 'qc' | 'inspector' | 'viewer'

export type WeldStage =
    | 'fitup'
    | 'backgouge'
    | 'lamcheck'
    | 'welding'
    | 'visual'
    | 'mpi'
    | 'ut'
    | 'pwht'
    | 'completed'
    | 'rejected'

export type NDTResult = 'ACC' | 'REJ' | 'N/A' | null
export type FinalStatus = 'OK' | 'REPAIR' | 'REJECT' | null
export type RequestStatus = 'draft' | 'submitted' | 'scheduled' | 'completed' | 'cancelled'
export type NDTType = 'MT' | 'UT' | 'RT' | 'PT' | 'PWHT' | 'VISUAL' | 'FITUP' | 'BACKGOUGE' | 'LAMCHECK'
export type RequestType = 'fitup' | 'backgouge' | 'lamcheck' | 'mpi' | 'visual' | 'final_visual'

// ============================================================
// DATABASE TYPES
// ============================================================

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
    created_by: string | null
}

export interface Drawing {
    id: string
    project_id: string
    drawing_no: string          // 9001-2211-DS-0032-01-WM
    description: string | null
    part: string | null         // JACKET, TOPSIDE, ...
    nde_percentage: string | null
    total_welds: number
    created_at: string
}

export interface Weld {
    id: string
    project_id: string
    drawing_id: string | null

    // Basic info
    weld_id: string             // 9001-2211-DS-0032-01-WM1
    weld_no: string             // 1, 17R1
    drawing_no: string          // 9001-2211-DS-0032-01-WM
    is_repair: boolean
    repair_no: number

    // Classification
    joint_type: string | null   // DB, DV, SB, X2, X3, SV
    ndt_requirements: string | null
    wps_no: string | null
    goc_code: string | null

    // Dimensions
    weld_length: number | null
    thickness: number | null
    weld_size: string | null

    // Welders
    welders: string | null      // BGT-0005;BGT-0015

    // Fit-Up
    fitup_request_no: string | null   // F-044
    fitup_inspector: string | null
    fitup_date: string | null
    fitup_accepted_date: string | null

    // Backgouge
    backgouge_request_no: string | null
    backgouge_date: string | null

    // Visual
    visual_request_no: string | null
    visual_inspector: string | null
    visual_date: string | null

    // NDT Results
    fitup_result: NDTResult
    visual_result: NDTResult
    mt_result: NDTResult
    ut_result: NDTResult
    rt_result: NDTResult
    pwht_result: NDTResult

    // Report Numbers
    mt_report_no: string | null
    ut_report_no: string | null
    rt_report_no: string | null

    // Repair
    repair_length: number | null

    // IRN
    irn_no: string | null
    irn_date: string | null

    // Status
    stage: WeldStage
    final_status: FinalStatus
    remarks: string | null

    // Metadata
    created_at: string
    updated_at: string
    created_by: string | null
    updated_by: string | null
}

export interface InspectionRequest {
    id: string
    project_id: string
    request_no: string          // TNHA-JK-F-146
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
    created_at: string
    updated_at: string
    created_by: string | null
    updated_by: string | null
    // Joined
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
    ip_address: string | null
}

// ============================================================
// VIEW TYPES (từ database views)
// ============================================================

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

// ============================================================
// FORM TYPES
// ============================================================

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

// ============================================================
// FILTER/SEARCH TYPES
// ============================================================

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

// ============================================================
// STAGE LABELS (hiển thị tiếng Việt)
// ============================================================

export const STAGE_LABELS: Record<WeldStage, string> = {
    fitup: 'Fit-Up',
    backgouge: 'Back Gouging',
    lamcheck: 'Lamination Check',
    welding: 'Welding',
    visual: 'Visual Final',
    mpi: 'MPI/MT',
    ut: 'UT',
    pwht: 'PWHT',
    completed: 'Hoàn thành',
    rejected: 'Bị từ chối',
}

export const STAGE_COLORS: Record<WeldStage, string> = {
    fitup: 'bg-blue-100 text-blue-800',
    backgouge: 'bg-purple-100 text-purple-800',
    lamcheck: 'bg-indigo-100 text-indigo-800',
    welding: 'bg-yellow-100 text-yellow-800',
    visual: 'bg-orange-100 text-orange-800',
    mpi: 'bg-pink-100 text-pink-800',
    ut: 'bg-cyan-100 text-cyan-800',
    pwht: 'bg-teal-100 text-teal-800',
    completed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
}

export const ROLE_LABELS: Record<UserRole, string> = {
    admin: 'Quản trị viên',
    dcc: 'DCC',
    qc: 'QC Engineer',
    inspector: 'Inspector',
    viewer: 'Xem (Read-only)',
}

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
    fitup: 'Fit-Up',
    backgouge: 'Back Gouging',
    lamcheck: 'Lamination Check',
    mpi: 'MPI / MT',
    visual: 'Visual',
    final_visual: 'Final Visual (100%MT & UT)',
}

export const NDT_RESULT_COLORS = {
    ACC: 'bg-green-100 text-green-800',
    PASS: 'bg-green-100 text-green-800',
    REJ: 'bg-red-100 text-red-800',
    REJECT: 'bg-red-100 text-red-800',
    REPAIR: 'bg-yellow-100 text-yellow-800',
    'N/A': 'bg-gray-100 text-gray-600',
}
