function normalizeText(value: unknown) {
    return value == null ? '' : String(value).trim().toUpperCase()
}

export function shouldCountVisualProgress({
    visualDate,
    overallStatus,
}: {
    visualDate: string | null | undefined
    overallStatus: string | null | undefined
}) {
    if (!visualDate) {
        return false
    }

    const normalizedStatus = normalizeText(overallStatus)
    return normalizedStatus !== 'REJ' && normalizedStatus !== 'DELETE'
}
