import { RequestType } from '@/types'

export const REQUEST_TYPE_COLUMN: Record<Exclude<RequestType, 'vs_final'>, string> = {
    fitup: 'fitup_request_no',
    backgouge: 'backgouge_request_no',
    lamcheck: 'lamcheck_request_no',
    request: 'inspection_request_no',
}

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
    fitup: 'Fit-Up',
    backgouge: 'Backgouge',
    lamcheck: 'Lamcheck',
    request: 'Request NDT / Visual khách hàng',
    vs_final: 'VS Final',
}

export const REQUEST_PREFIX: Record<Exclude<RequestType, 'vs_final'>, string> = {
    fitup: 'F-',
    backgouge: 'BG-',
    lamcheck: 'UL-',
    request: 'V-',
}

export interface RequestMethodFlags {
    fitUp: boolean
    finalVisual: boolean
    mt: boolean
    pt: boolean
    ut: boolean
    rt: boolean
    other: boolean
    otherLabel: string
}

type InferInput = {
    ndt_requirements?: string | null
}

function normalizeRequirement(input: string) {
    return input
        .toUpperCase()
        .replace(/\s+/g, '')
        .replace(/&/g, ',')
        .replace(/\//g, ',')
}

export function inferRequestMethods(requestType: RequestType, welds: InferInput[]): RequestMethodFlags {
    const flags: RequestMethodFlags = {
        fitUp: requestType === 'fitup',
        finalVisual: requestType === 'request' || requestType === 'vs_final',
        mt: false,
        pt: false,
        ut: false,
        rt: false,
        other: false,
        otherLabel: '',
    }

    const otherTokens = new Set<string>()

    welds.forEach((weld) => {
        const raw = (weld.ndt_requirements || '').trim()
        if (!raw) {
            return
        }

        const normalized = normalizeRequirement(raw)

        if (normalized.includes('MT')) flags.mt = true
        if (normalized.includes('PT')) flags.pt = true
        if (normalized.includes('UT') || normalized.includes('PAUT')) flags.ut = true
        if (normalized.includes('RT')) flags.rt = true

        const tokens = normalized.split(',').filter(Boolean)
        tokens.forEach((token) => {
            if (!['FITUP', 'FINALVISUAL', 'VISUAL', 'MT', 'PT', 'UT', 'RT', 'PAUT'].includes(token)) {
                otherTokens.add(token)
            }
        })

        if (normalized.includes('PAUT')) {
            otherTokens.add('PAUT')
        }
    })

    if (otherTokens.size > 0) {
        flags.other = true
        flags.otherLabel = Array.from(otherTokens).join(', ')
    }

    return flags
}

export function normalizeRequestNo(requestNo: string) {
    return requestNo.trim().toUpperCase()
}
