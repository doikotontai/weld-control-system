export interface SelectFilterOption {
    value: string
    label: string
}

export const BLANK_FILTER_VALUE = '__BLANK__'
export const DEFAULT_FILTER_OPTION: SelectFilterOption = { value: '', label: 'Tất cả' }
export const BLANK_FILTER_OPTION: SelectFilterOption = { value: BLANK_FILTER_VALUE, label: 'BLANKS' }

export function normalizeFilterText(value: unknown) {
    return value == null ? '' : String(value).trim()
}

export function normalizeFilterDate(value: unknown) {
    return value ? String(value).slice(0, 10) : ''
}

export function matchesGlobalSearch<Row extends Record<string, unknown>>(
    row: Row,
    search: string,
    columns: string[]
) {
    const normalizedSearch = normalizeFilterText(search).toLowerCase()
    if (!normalizedSearch) {
        return true
    }

    return columns.some((column) => normalizeFilterText(row[column]).toLowerCase().includes(normalizedSearch))
}

export function matchesColumnFilters<Row extends Record<string, unknown>>(
    row: Row,
    filters: Record<string, string>,
    options: { excludeColumn?: string | null; dateColumns?: ReadonlySet<string> } = {}
) {
    const excludeColumn = options.excludeColumn || null
    const dateColumns = options.dateColumns || new Set<string>()

    return Object.entries(filters).every(([column, selected]) => {
        if (!selected || column === excludeColumn) {
            return true
        }

        const value = dateColumns.has(column) ? normalizeFilterDate(row[column]) : normalizeFilterText(row[column])
        if (selected === BLANK_FILTER_VALUE) {
            return !value
        }

        return value === selected
    })
}

export function buildScopedFilterOptions<Row extends Record<string, unknown>>({
    rows,
    columns,
    filters = {},
    globalSearch = '',
    globalSearchColumns = [],
    dateColumns = new Set<string>(),
    displayValueMap = {},
}: {
    rows: Row[]
    columns: string[]
    filters?: Record<string, string>
    globalSearch?: string
    globalSearchColumns?: string[]
    dateColumns?: ReadonlySet<string>
    displayValueMap?: Record<string, (value: string) => string>
}) {
    return columns.reduce<Record<string, SelectFilterOption[]>>((acc, column) => {
        const scopedRows = rows.filter(
            (row) =>
                matchesGlobalSearch(row, globalSearch, globalSearchColumns) &&
                matchesColumnFilters(row, filters, { excludeColumn: column, dateColumns })
        )

        const values = new Set<string>()
        let hasBlank = false

        for (const row of scopedRows) {
            const rawValue = dateColumns.has(column) ? normalizeFilterDate(row[column]) : normalizeFilterText(row[column])
            if (!rawValue) {
                hasBlank = true
                continue
            }
            values.add(rawValue)
        }

        const sortedValues = Array.from(values).sort((left, right) =>
            left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
        )

        acc[column] = [
            DEFAULT_FILTER_OPTION,
            ...(hasBlank ? [BLANK_FILTER_OPTION] : []),
            ...sortedValues.map((value) => ({
                value,
                label: displayValueMap[column] ? displayValueMap[column](value) : value,
            })),
        ]
        return acc
    }, {})
}
