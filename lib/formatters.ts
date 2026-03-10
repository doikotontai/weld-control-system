export function formatNumber(value: number | string | null | undefined): string {
    if (value == null || value === '') return ''
    const parsed = Number(value)
    if (Number.isNaN(parsed)) return ''
    return new Intl.NumberFormat('vi-VN').format(parsed)
}

function asDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

function getParts(value: string | Date | null | undefined) {
    const date = asDate(value)
    if (!date) return null

    const parts = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date)

    return Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<string, string>
}

export function formatDate(value: string | Date | null | undefined): string {
    const parts = getParts(value)
    if (!parts) return ''
    return `${parts.day}/${parts.month}/${parts.year}`
}

export function formatDateTime(value: string | Date | null | undefined): string {
    const parts = getParts(value)
    if (!parts) return ''
    return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`
}
