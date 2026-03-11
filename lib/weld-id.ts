const INTERNAL_WELD_ID_SUFFIX = /__ROW\d+$/i

export function getDisplayWeldId(value: string | null | undefined) {
    if (!value) return ''
    return value.replace(INTERNAL_WELD_ID_SUFFIX, '')
}

