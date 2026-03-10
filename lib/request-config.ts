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

const REQUEST_METHODS_META_PREFIX = '[REQUEST_METHODS]'

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

function normalizeRequirementToken(token: string) {
    return token
        .replace(/^\d+%/g, '')
        .replace(/^(MT|PT|UT|RT|PAUT|FITUP|FINALVISUAL|VISUAL)+$/g, '$1')
}

export function inferRequestMethods(requestType: RequestType, welds: InferInput[]): RequestMethodFlags {
    const flags = createEmptyRequestMethods(requestType)

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

        const tokens = normalized
            .split(',')
            .map((token) => normalizeRequirementToken(token))
            .filter(Boolean)
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

export function createEmptyRequestMethods(requestType?: RequestType): RequestMethodFlags {
    return {
        fitUp: requestType === 'fitup',
        finalVisual: requestType === 'vs_final',
        mt: false,
        pt: false,
        ut: false,
        rt: false,
        other: false,
        otherLabel: '',
    }
}

export function normalizeRequestMethods(methods?: Partial<RequestMethodFlags> | null, requestType?: RequestType): RequestMethodFlags {
    const defaults = createEmptyRequestMethods(requestType)

    return {
        fitUp: methods?.fitUp ?? defaults.fitUp,
        finalVisual: methods?.finalVisual ?? defaults.finalVisual,
        mt: methods?.mt ?? false,
        pt: methods?.pt ?? false,
        ut: methods?.ut ?? false,
        rt: methods?.rt ?? false,
        other: methods?.other ?? false,
        otherLabel: String(methods?.otherLabel || '').trim(),
    }
}

export function parseRequestMethodsFromRemarks(rawRemarks: string | null | undefined, requestType?: RequestType) {
    const text = String(rawRemarks || '')

    if (!text.startsWith(REQUEST_METHODS_META_PREFIX)) {
        return {
            methods: null as RequestMethodFlags | null,
            remarks: text,
        }
    }

    const newlineIndex = text.indexOf('\n')
    const jsonChunk =
        newlineIndex === -1
            ? text.slice(REQUEST_METHODS_META_PREFIX.length)
            : text.slice(REQUEST_METHODS_META_PREFIX.length, newlineIndex)

    try {
        const parsed = JSON.parse(jsonChunk) as Partial<RequestMethodFlags>
        return {
            methods: normalizeRequestMethods(parsed, requestType),
            remarks: newlineIndex === -1 ? '' : text.slice(newlineIndex + 1),
        }
    } catch {
        return {
            methods: null as RequestMethodFlags | null,
            remarks: text,
        }
    }
}

export function encodeRequestMethodsIntoRemarks(remarks: string | null | undefined, methods: RequestMethodFlags) {
    const visibleRemarks = String(remarks || '').trim()
    const normalizedMethods = normalizeRequestMethods(methods)
    const metaLine = `${REQUEST_METHODS_META_PREFIX}${JSON.stringify(normalizedMethods)}`

    return visibleRemarks ? `${metaLine}\n${visibleRemarks}` : metaLine
}

export function normalizeRequestNo(requestNo: string) {
    return requestNo.trim().toUpperCase()
}
