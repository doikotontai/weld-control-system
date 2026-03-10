import { FinalStatus, WeldStage } from '@/types'

export type WorkflowOverallStatus =
    | 'HAVE NOT WELD'
    | 'NOT YET FITUP'
    | 'NOT YET VISUAL'
    | 'NOT YET NDT'
    | 'FINISH'
    | 'REJ'
    | 'DELETE'

export interface WeldWorkflowInput {
    weldNo?: string | null
    fitupDate?: string | null
    visualDate?: string | null
    ndtRequirements?: string | null
    ndtOverallResult?: string | null
    overallStatusRaw?: string | null
    inspectionRequestNo?: string | null
    backgougeDate?: string | null
    backgougeRequestNo?: string | null
    lamcheckDate?: string | null
    lamcheckRequestNo?: string | null
    lamcheckReportNo?: string | null
    releaseFinalDate?: string | null
    releaseFinalRequestNo?: string | null
    releaseNoteDate?: string | null
    releaseNoteNo?: string | null
    cutOff?: string | null
    mw1No?: string | null
}

export interface WeldWorkflowState {
    overallStatus: WorkflowOverallStatus
    ndtOverallResult: 'ACC' | 'REJ' | null
    stage: WeldStage
    finalStatus: FinalStatus
}

function normalizeText(value: unknown) {
    return value == null ? '' : String(value).trim()
}

function hasValue(value: unknown) {
    return normalizeText(value) !== ''
}

function normalizeResult(value: unknown): 'ACC' | 'REJ' | null {
    const normalized = normalizeText(value).toUpperCase()
    if (normalized === 'ACC' || normalized === 'PASS' || normalized === 'FINISH') {
        return 'ACC'
    }

    if (normalized === 'REJ' || normalized === 'REJECT') {
        return 'REJ'
    }

    return null
}

function requiresNdt(ndtRequirements: unknown) {
    const normalized = normalizeText(ndtRequirements).toUpperCase()
    if (!normalized) {
        return false
    }

    return /(MT|UT|RT|PT|PAUT|PWHT|NDT)/.test(normalized)
}

export function deriveWeldWorkflow(input: WeldWorkflowInput): WeldWorkflowState {
    const rawOverallStatus = normalizeText(input.overallStatusRaw).toUpperCase()
    const ndtOverallResult = normalizeResult(input.ndtOverallResult)

    let overallStatus: WorkflowOverallStatus

    if (rawOverallStatus === 'DELETE') {
        overallStatus = 'DELETE'
    } else if (!hasValue(input.weldNo)) {
        overallStatus = 'HAVE NOT WELD'
    } else if (!hasValue(input.fitupDate)) {
        overallStatus = 'NOT YET FITUP'
    } else if (!hasValue(input.visualDate)) {
        overallStatus = 'NOT YET VISUAL'
    } else if (requiresNdt(input.ndtRequirements)) {
        if (!ndtOverallResult) {
            overallStatus = 'NOT YET NDT'
        } else if (ndtOverallResult === 'REJ') {
            overallStatus = 'REJ'
        } else {
            overallStatus = 'FINISH'
        }
    } else {
        overallStatus = 'FINISH'
    }

    let stage: WeldStage
    if (overallStatus === 'DELETE' || overallStatus === 'REJ') {
        stage = 'rejected'
    } else if (hasValue(input.mw1No)) {
        stage = 'mw1'
    } else if (hasValue(input.cutOff)) {
        stage = 'cutoff'
    } else if (
        hasValue(input.releaseNoteNo) ||
        hasValue(input.releaseNoteDate) ||
        hasValue(input.releaseFinalDate) ||
        hasValue(input.releaseFinalRequestNo)
    ) {
        stage = 'release'
    } else if (overallStatus === 'NOT YET FITUP' || overallStatus === 'HAVE NOT WELD') {
        stage = 'fitup'
    } else if (overallStatus === 'NOT YET VISUAL') {
        stage = 'visual'
    } else if (overallStatus === 'NOT YET NDT') {
        if (
            hasValue(input.lamcheckDate) ||
            hasValue(input.lamcheckRequestNo) ||
            hasValue(input.lamcheckReportNo)
        ) {
            stage = 'lamcheck'
        } else if (hasValue(input.backgougeDate) || hasValue(input.backgougeRequestNo)) {
            stage = 'backgouge'
        } else if (hasValue(input.inspectionRequestNo)) {
            stage = 'request'
        } else {
            stage = 'visual'
        }
    } else {
        stage = 'completed'
    }

    const finalStatus: FinalStatus =
        overallStatus === 'FINISH'
            ? 'OK'
            : overallStatus === 'REJ'
              ? 'REJECT'
              : null

    return {
        overallStatus,
        ndtOverallResult,
        stage,
        finalStatus,
    }
}
