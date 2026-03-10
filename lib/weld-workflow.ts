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
    mtResult?: string | null
    utResult?: string | null
    rtResult?: string | null
    pwhtResult?: string | null
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

    if (normalized === 'REJ' || normalized === 'REJECT' || normalized === 'REPAIR') {
        return 'REJ'
    }

    return null
}

type RequiredNdtType = 'MT' | 'UT' | 'RT' | 'PT' | 'PWHT' | 'PAUT'

export function parseRequiredNdtTypes(ndtRequirements: unknown): RequiredNdtType[] {
    const normalized = normalizeText(ndtRequirements).toUpperCase()
    if (!normalized) {
        return []
    }

    const matches = normalized.match(/PAUT|PWHT|MT|UT|RT|PT/g) || []
    return [...new Set(matches)] as RequiredNdtType[]
}

function requiresNdt(ndtRequirements: unknown) {
    return parseRequiredNdtTypes(ndtRequirements).length > 0
}

function deriveOverallNdtResult(input: WeldWorkflowInput): 'ACC' | 'REJ' | null {
    const explicitResult = normalizeResult(input.ndtOverallResult)
    if (explicitResult) {
        return explicitResult
    }

    const requiredTypes = parseRequiredNdtTypes(input.ndtRequirements)
    if (requiredTypes.length === 0) {
        return null
    }

    const resultMap: Record<RequiredNdtType, 'ACC' | 'REJ' | null> = {
        MT: normalizeResult(input.mtResult),
        UT: normalizeResult(input.utResult),
        RT: normalizeResult(input.rtResult),
        PT: null,
        PWHT: normalizeResult(input.pwhtResult),
        PAUT: null,
    }

    if (requiredTypes.some((type) => resultMap[type] === 'REJ')) {
        return 'REJ'
    }

    if (requiredTypes.every((type) => resultMap[type] === 'ACC')) {
        return 'ACC'
    }

    return null
}

export function deriveWeldWorkflow(input: WeldWorkflowInput): WeldWorkflowState {
    const rawOverallStatus = normalizeText(input.overallStatusRaw).toUpperCase()
    const ndtOverallResult = deriveOverallNdtResult(input)

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
