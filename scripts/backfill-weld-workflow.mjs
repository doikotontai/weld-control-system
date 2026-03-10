import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
    const envPath = path.resolve('.env.local')
    const text = fs.readFileSync(envPath, 'utf8')
    return Object.fromEntries(
        text
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => {
                const index = line.indexOf('=')
                return [line.slice(0, index), line.slice(index + 1)]
            })
    )
}

function normalizeText(value) {
    return value == null ? '' : String(value).trim()
}

function hasValue(value) {
    return normalizeText(value) !== ''
}

function normalizeResult(value) {
    const normalized = normalizeText(value).toUpperCase()
    if (normalized === 'ACC' || normalized === 'PASS' || normalized === 'FINISH') {
        return 'ACC'
    }

    if (normalized === 'REJ' || normalized === 'REJECT' || normalized === 'REPAIR') {
        return 'REJ'
    }

    return null
}

function parseRequiredNdtTypes(ndtRequirements) {
    const normalized = normalizeText(ndtRequirements).toUpperCase()
    if (!normalized) {
        return []
    }

    return [...new Set(normalized.match(/PAUT|PWHT|MT|UT|RT|PT/g) || [])]
}

function deriveOverallNdtResult(row) {
    const explicitResult = normalizeResult(row.ndt_overall_result)
    if (explicitResult) {
        return explicitResult
    }

    const requiredTypes = parseRequiredNdtTypes(row.ndt_requirements)
    if (requiredTypes.length === 0) {
        return null
    }

    const resultMap = {
        MT: normalizeResult(row.mt_result),
        UT: normalizeResult(row.ut_result),
        RT: normalizeResult(row.rt_result),
        PT: null,
        PWHT: normalizeResult(row.pwht_result),
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

function deriveWorkflow(row) {
    const rawOverallStatus = normalizeText(row.overall_status).toUpperCase()
    const ndtOverallResult = deriveOverallNdtResult(row)
    let overallStatus

    if (rawOverallStatus === 'DELETE') {
        overallStatus = 'DELETE'
    } else if (!hasValue(row.weld_no)) {
        overallStatus = 'HAVE NOT WELD'
    } else if (!hasValue(row.fitup_date)) {
        overallStatus = 'NOT YET FITUP'
    } else if (!hasValue(row.visual_date)) {
        overallStatus = 'NOT YET VISUAL'
    } else if (parseRequiredNdtTypes(row.ndt_requirements).length > 0) {
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

    let stage
    if (overallStatus === 'DELETE' || overallStatus === 'REJ') {
        stage = 'rejected'
    } else if (hasValue(row.mw1_no)) {
        stage = 'mw1'
    } else if (hasValue(row.cut_off)) {
        stage = 'cutoff'
    } else if (
        hasValue(row.release_note_no) ||
        hasValue(row.release_note_date) ||
        hasValue(row.release_final_date) ||
        hasValue(row.release_final_request_no)
    ) {
        stage = 'release'
    } else if (overallStatus === 'NOT YET FITUP' || overallStatus === 'HAVE NOT WELD') {
        stage = 'fitup'
    } else if (overallStatus === 'NOT YET VISUAL') {
        stage = 'visual'
    } else if (overallStatus === 'NOT YET NDT') {
        if (hasValue(row.lamcheck_date) || hasValue(row.lamcheck_request_no) || hasValue(row.lamcheck_report_no)) {
            stage = 'lamcheck'
        } else if (hasValue(row.backgouge_date) || hasValue(row.backgouge_request_no)) {
            stage = 'backgouge'
        } else if (hasValue(row.inspection_request_no)) {
            stage = 'request'
        } else {
            stage = 'visual'
        }
    } else {
        stage = 'completed'
    }

    const finalStatus = overallStatus === 'FINISH' ? 'OK' : overallStatus === 'REJ' ? 'REJECT' : null

    return {
        overall_status: overallStatus,
        ndt_overall_result: ndtOverallResult,
        stage,
        final_status: finalStatus,
    }
}

async function main() {
    const env = loadEnv()
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    })

    const pageSize = 500
    let from = 0
    let totalUpdated = 0

    for (;;) {
        const { data, error } = await supabase
            .from('welds')
            .select('id, weld_no, fitup_date, visual_date, ndt_requirements, ndt_overall_result, overall_status, mt_result, ut_result, rt_result, pwht_result, inspection_request_no, backgouge_date, backgouge_request_no, lamcheck_date, lamcheck_request_no, lamcheck_report_no, release_final_date, release_final_request_no, release_note_date, release_note_no, cut_off, mw1_no')
            .order('created_at', { ascending: true })
            .range(from, from + pageSize - 1)

        if (error) {
            throw error
        }

        if (!data || data.length === 0) {
            break
        }

        const payload = data.map((row) => ({
            id: row.id,
            ...deriveWorkflow(row),
        }))

        for (const item of payload) {
            const { id, ...values } = item
            const { error: updateError } = await supabase.from('welds').update(values).eq('id', id)
            if (updateError) {
                throw updateError
            }
        }

        totalUpdated += payload.length
        from += pageSize
        console.log(`Updated ${totalUpdated} welds...`)
    }

    const { count: blankStatus } = await supabase
        .from('welds')
        .select('*', { count: 'exact', head: true })
        .or('overall_status.is.null,overall_status.eq.')

    const { count: blankNdt } = await supabase
        .from('welds')
        .select('*', { count: 'exact', head: true })
        .or('ndt_overall_result.is.null,ndt_overall_result.eq.')

    console.log(JSON.stringify({ totalUpdated, blankStatus, blankNdt }, null, 2))
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
