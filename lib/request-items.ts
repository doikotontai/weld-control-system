export interface RequestWeldLike {
    id: string
    weld_id?: string | null
    drawing_no?: string | null
    weld_no?: string | null
    joint_type?: string | null
    welders?: string | null
    wps_no?: string | null
    weld_size?: string | null
    ndt_requirements?: string | null
    goc_code?: string | null
    weld_finish_date?: string | null
    position?: string | null
    weld_length?: number | null
    thickness?: number | null
    remarks?: string | null
}

export interface EditableRequestItem {
    weldId: string
    weld_id: string
    drawing_no: string
    weld_no: string
    weld_type: string
    welder_no: string
    wps: string
    weld_size: string
    inspection_required: string
    goc_code: string
    finish_date: string
    remarks: string
}

export function deriveWeldSize(weld: Pick<RequestWeldLike, 'weld_size' | 'position' | 'weld_length' | 'thickness'>) {
    if (weld.weld_size) {
        return String(weld.weld_size)
    }

    const position = String(weld.position || '').trim().toUpperCase()
    const weldLength = Number(weld.weld_length || 0)
    const thickness = Number(weld.thickness || 0)

    if (!weldLength) {
        return ''
    }

    if (position === 'D') {
        const diameter = Math.round((weldLength / 3.14) * 100) / 100
        return thickness ? `Ø${diameter}x${thickness}` : `Ø${diameter}`
    }

    if (position === 'L') {
        return thickness ? `L=${weldLength}x${thickness}` : `L=${weldLength}`
    }

    return thickness ? `${weldLength}x${thickness}` : `${weldLength}`
}

export function buildEditableRequestItem(weld: RequestWeldLike, overrides?: Partial<EditableRequestItem>): EditableRequestItem {
    return {
        weldId: weld.id,
        weld_id: String(weld.weld_id || ''),
        drawing_no: String(weld.drawing_no || ''),
        weld_no: String(weld.weld_no || ''),
        weld_type: String(weld.joint_type || ''),
        welder_no: String(weld.welders || ''),
        wps: String(weld.wps_no || ''),
        weld_size: deriveWeldSize(weld),
        inspection_required: String(weld.ndt_requirements || ''),
        goc_code: String(weld.goc_code || ''),
        finish_date: String(weld.weld_finish_date || '').slice(0, 10),
        remarks: String(weld.remarks || ''),
        ...overrides,
    }
}

