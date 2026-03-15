'use client'

import { useMemo, useState, useTransition } from 'react'
import * as XLSX from 'xlsx'
import SyncedTableFrame from '@/components/SyncedTableFrame'
import { syncProjectDrawings, updateDrawingMetadata } from '@/app/actions/drawings'

type RegistryRow = {
    id?: string
    project_id: string
    drawing_no: string
    description: string | null
    part: string | null
    nde_pct: string | null
    total_welds: number
    fitup_done: number
    visual_done: number
    ndt_done: number
    release_done: number
    goc_codes: string
    release_notes: string
    latest_release_note_date: string | null
    transmittal_numbers: string
    cut_off_refs: string
    mw1_numbers: string
    created_at?: string
}

type DraftMap = Record<string, { description: string; part: string; nde_pct: string }>

function normalizeText(value: unknown) {
    return value == null ? '' : String(value).trim()
}

function exportRowsToExcel(rows: RegistryRow[]) {
    const worksheet = XLSX.utils.json_to_sheet(
        rows.map((row) => ({
            'Bản vẽ': row.drawing_no,
            'Tên bản vẽ / Mô tả': row.description || '',
            'Hạng mục': row.part || '',
            'NDE %': row.nde_pct || '',
            'Tổng mối hàn': row.total_welds,
            'Đã Fit-Up': row.fitup_done,
            'Đã Visual': row.visual_done,
            'Đã có NDT': row.ndt_done,
            'Đã release': row.release_done,
            'GOC Code': row.goc_codes,
            'Release note': row.release_notes,
            'Ngày release mới nhất': row.latest_release_note_date || '',
            'Transmittal No': row.transmittal_numbers,
            'Cut-Off': row.cut_off_refs,
            'MW1': row.mw1_numbers,
        }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Drawing Map')
    XLSX.writeFile(workbook, `drawing-map-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export default function DrawingsRegistryClient({
    initialRows,
    projectId,
    canEdit,
}: {
    initialRows: RegistryRow[]
    projectId: string
    canEdit: boolean
}) {
    const [rows, setRows] = useState(initialRows)
    const [search, setSearch] = useState('')
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [pending, startTransition] = useTransition()
    const [savingId, setSavingId] = useState<string | null>(null)
    const [drafts, setDrafts] = useState<DraftMap>(() =>
        Object.fromEntries(
            initialRows
                .filter((row) => row.id)
                .map((row) => [
                    row.id as string,
                    {
                        description: row.description || '',
                        part: row.part || '',
                        nde_pct: row.nde_pct || '',
                    },
                ])
        )
    )

    const filteredRows = useMemo(() => {
        const keyword = normalizeText(search).toLowerCase()
        if (!keyword) return rows
        return rows.filter((row) =>
            [
                row.drawing_no,
                row.description,
                row.part,
                row.nde_pct,
                row.goc_codes,
                row.release_notes,
                row.transmittal_numbers,
                row.cut_off_refs,
                row.mw1_numbers,
            ]
                .map((value) => normalizeText(value).toLowerCase())
                .some((value) => value.includes(keyword))
        )
    }, [rows, search])

    const handleSync = () => {
        setMessage(null)
        startTransition(async () => {
            const result = await syncProjectDrawings(projectId)
            if (!result.success) {
                setMessage({ type: 'error', text: result.error || 'Không thể đồng bộ Drawing Map.' })
                return
            }
            window.location.reload()
        })
    }

    const handleDraftChange = (id: string, field: 'description' | 'part' | 'nde_pct', value: string) => {
        setDrafts((current) => ({
            ...current,
            [id]: {
                description: current[id]?.description || '',
                part: current[id]?.part || '',
                nde_pct: current[id]?.nde_pct || '',
                [field]: value,
            },
        }))
    }

    const handleSaveRow = (row: RegistryRow) => {
        if (!row.id) return
        setSavingId(row.id)
        setMessage(null)
        const draft = drafts[row.id] || {
            description: row.description || '',
            part: row.part || '',
            nde_pct: row.nde_pct || '',
        }

        startTransition(async () => {
            const result = await updateDrawingMetadata(row.id as string, draft)
            if (!result.success) {
                setMessage({ type: 'error', text: result.error || 'Không thể lưu metadata bản vẽ.' })
                setSavingId(null)
                return
            }

            setRows((current) =>
                current.map((item) =>
                    item.id === row.id
                        ? {
                              ...item,
                              description: draft.description || null,
                              part: draft.part || null,
                              nde_pct: draft.nde_pct || null,
                          }
                        : item
                )
            )
            setMessage({ type: 'success', text: `Đã lưu metadata cho bản vẽ ${row.drawing_no}.` })
            setSavingId(null)
        })
    }

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 16,
                }}
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Lọc theo bản vẽ, mô tả, hạng mục, GOC, release note..."
                    style={{
                        minWidth: 320,
                        flex: '1 1 360px',
                        border: '1px solid #cbd5e1',
                        borderRadius: 10,
                        padding: '10px 12px',
                    }}
                />
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {canEdit ? (
                        <button type="button" className="btn btn-secondary" onClick={handleSync} disabled={pending}>
                            {pending ? 'Đang đồng bộ...' : 'Đồng bộ từ mối hàn'}
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => exportRowsToExcel(filteredRows)}
                    >
                        Xuất Excel Drawing Map
                    </button>
                </div>
            </div>

            {message ? (
                <div
                    style={{
                        marginBottom: 16,
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                        color: message.type === 'success' ? '#166534' : '#991b1b',
                        fontWeight: 600,
                    }}
                >
                    {message.text}
                </div>
            ) : null}

            <SyncedTableFrame>
                <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {[
                                '#',
                                'Bản vẽ',
                                'Tên bản vẽ / Mô tả',
                                'Hạng mục',
                                'NDE %',
                                'Tổng mối hàn',
                                'Đã Fit-Up',
                                'Đã Visual',
                                'Đã có NDT',
                                'Đã release',
                                'GOC Code',
                                'Release note',
                                'Ngày release mới nhất',
                                'Transmittal No',
                                'Cut-Off',
                                'MW1',
                                'Thao tác',
                            ].map((label) => (
                                <th
                                    key={label}
                                    style={{
                                        padding: '10px 12px',
                                        background: '#f8fafc',
                                        borderBottom: '2px solid #e2e8f0',
                                        color: '#475569',
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        textAlign: 'left',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.map((row, index) => {
                            const draft = row.id ? drafts[row.id] : undefined
                            const editableDraft = draft || {
                                description: row.description || '',
                                part: row.part || '',
                                nde_pct: row.nde_pct || '',
                            }
                            return (
                                <tr key={`${row.drawing_no}-${row.id || 'virtual'}`} style={{ background: index % 2 ? '#fafafa' : 'white' }}>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#94a3b8' }}>
                                        {index + 1}
                                    </td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#0f172a' }}>
                                        {row.drawing_no}
                                    </td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                        {canEdit && row.id ? (
                                            <input
                                                value={editableDraft.description}
                                                onChange={(event) =>
                                                    handleDraftChange(row.id as string, 'description', event.target.value)
                                                }
                                                style={{ minWidth: 220, border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
                                            />
                                        ) : (
                                            row.description || '—'
                                        )}
                                    </td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                        {canEdit && row.id ? (
                                            <input
                                                value={editableDraft.part}
                                                onChange={(event) =>
                                                    handleDraftChange(row.id as string, 'part', event.target.value)
                                                }
                                                style={{ minWidth: 130, border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
                                            />
                                        ) : (
                                            row.part || '—'
                                        )}
                                    </td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                        {canEdit && row.id ? (
                                            <input
                                                value={editableDraft.nde_pct}
                                                onChange={(event) =>
                                                    handleDraftChange(row.id as string, 'nde_pct', event.target.value)
                                                }
                                                style={{ minWidth: 90, border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
                                            />
                                        ) : (
                                            row.nde_pct || '—'
                                        )}
                                    </td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{row.total_welds}</td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{row.fitup_done}</td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{row.visual_done}</td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{row.ndt_done}</td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{row.release_done}</td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row.goc_codes || '—'}</td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row.release_notes || '—'}</td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row.latest_release_note_date || '—'}</td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row.transmittal_numbers || '—'}</td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row.cut_off_refs || '—'}</td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row.mw1_numbers || '—'}</td>
                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                        {canEdit && row.id ? (
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => handleSaveRow(row)}
                                                disabled={pending && savingId === row.id}
                                            >
                                                {pending && savingId === row.id ? 'Đang lưu...' : 'Lưu'}
                                            </button>
                                        ) : (
                                            <span style={{ color: '#94a3b8' }}>—</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </SyncedTableFrame>
        </div>
    )
}
