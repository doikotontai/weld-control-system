export async function fetchAllBatches<T>({
    pageSize = 1000,
    maxPages = 100,
    fetchPage,
}: {
    pageSize?: number
    maxPages?: number
    fetchPage: (from: number, to: number) => Promise<T[]>
}) {
    const rows: T[] = []

    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
        const from = pageIndex * pageSize
        const to = from + pageSize - 1
        const pageRows = await fetchPage(from, to)

        rows.push(...pageRows)

        if (pageRows.length < pageSize) {
            break
        }
    }

    return rows
}
