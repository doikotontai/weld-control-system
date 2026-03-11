'use client'

import Link from 'next/link'
import { ChangeEvent, ReactNode, useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import SyncedTableFrame from '@/components/SyncedTableFrame'
import { createClient } from '@/lib/supabase/client'
import {
    cloneLayoutWithColumns,
    detectWorkbookLayout,
    DuplicateWeldHandlingMode,
    DuplicateWeldWarning,
    IMPORT_FIELD_DEFINITIONS,
    ImportFieldKey,
    ImportLayoutConfig,
    ImportWorkbookSource,
    parseWorkbookData,
    PreviewRow,
    WeldUpsertRow,
} from '@/lib/excel-import'
import { formatNumber } from '@/lib/formatters'
import { PROJECT_CHANGE_EVENT, readActiveProjectIdFromCookie } from '@/lib/project-selection'
import { useRoleGuard } from '@/lib/use-role-guard'

interface ImportResult {
    success: number
    errors: number
    messages: string[]
}

interface WeldUpsertTable {
    upsert(values: WeldUpsertRow[], options: { onConflict: string }): Promise<{ error: { message: string } | null }>
}

type PreviewColumn = {
    label: string
    render: (row: PreviewRow) => ReactNode
}

const BATCH_SIZE = 50

const PREVIEW_COLUMNS: PreviewColumn[] = [
    { label: 'Weld ID', render: (row) => row.weld_id },
    { label: 'Drawing', render: (row) => row.drawing_no },
    { label: 'Weld No', render: (row) => row.weld_no },
    { label: 'Nhóm mối hàn', render: (row) => row.joint_family || '—' },
    { label: 'Loại / Cấu hình', render: (row) => row.joint_type || '—' },
    { label: 'NDT', render: (row) => row.ndt_requirements || '—' },
    { label: 'Position', render: (row) => row.position || '—' },
    { label: 'Length', render: (row) => formatNumber(row.weld_length) || '—' },
    { label: 'Thick', render: (row) => row.thickness ?? '—' },
    { label: 'Thick LC', render: (row) => row.thickness_lamcheck ?? '—' },
    { label: 'WPS', render: (row) => row.wps_no || '—' },
    { label: 'GOC Code', render: (row) => row.goc_code || '—' },
    { label: 'QC Fit-up', render: (row) => row.fitup_inspector || '—' },
    { label: 'Fit-up Date', render: (row) => row.fitup_date || '—' },
    { label: 'Fit-up RQ', render: (row) => row.fitup_request_no || '—' },
    { label: 'Finish Date', render: (row) => row.weld_finish_date || '—' },
    { label: 'Welders', render: (row) => row.welders || '—' },
    { label: 'QC Visual', render: (row) => row.visual_inspector || '—' },
    { label: 'Visual Date', render: (row) => row.visual_date || '—' },
    { label: 'NDT/Visual RQ', render: (row) => row.inspection_request_no || '—' },
    { label: 'BG Date', render: (row) => row.backgouge_date || '—' },
    { label: 'BG Request', render: (row) => row.backgouge_request_no || '—' },
    { label: 'LC Date', render: (row) => row.lamcheck_date || '—' },
    { label: 'LC Request', render: (row) => row.lamcheck_request_no || '—' },
    { label: 'MT', render: (row) => row.mt_result || '—' },
    { label: 'MT Report', render: (row) => row.mt_report_no || '—' },
    { label: 'UT', render: (row) => row.ut_result || '—' },
    { label: 'UT Report', render: (row) => row.ut_report_no || '—' },
    { label: 'RT', render: (row) => row.rt_result || '—' },
    { label: 'RT Report', render: (row) => row.rt_report_no || '—' },
    { label: 'Release Note', render: (row) => row.release_note_no || '—' },
    { label: 'Release Date', render: (row) => row.release_note_date || '—' },
    { label: 'Stage', render: (row) => row.stage || '—' },
]

function readWorkbookSource(fileData: ArrayBuffer, fileName: string): ImportWorkbookSource {
    const workbook = XLSX.read(new Uint8Array(fileData), { type: 'array', cellDates: true })
    const sheets: Record<string, unknown[][]> = {}
    for (const sheetName of workbook.SheetNames) {
        sheets[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null }) as unknown[][]
    }
    return { fileName, sheets }
}

function mappingCoverage(layout: ImportLayoutConfig) {
    return IMPORT_FIELD_DEFINITIONS.filter((field) => layout.fieldToColumn[field.key] != null).length
}

function findAssignedField(layout: ImportLayoutConfig, columnIndex: number): ImportFieldKey | '' {
    return IMPORT_FIELD_DEFINITIONS.find((field) => layout.fieldToColumn[field.key] === columnIndex)?.key ?? ''
}

function assignFieldToColumn(layout: ImportLayoutConfig, columnIndex: number, fieldKey: ImportFieldKey | '') {
    const nextMapping = { ...layout.fieldToColumn }
    for (const field of IMPORT_FIELD_DEFINITIONS) {
        if (nextMapping[field.key] === columnIndex) delete nextMapping[field.key]
    }
    if (fieldKey) {
        delete nextMapping[fieldKey]
        nextMapping[fieldKey] = columnIndex
    }
    return { ...layout, fieldToColumn: nextMapping }
}

function collectColumnSamples(source: ImportWorkbookSource | null, layout: ImportLayoutConfig | null) {
    const samples = new Map<number, string>()
    if (!source || !layout) return samples
    const rows = source.sheets[layout.sheetName] || []
    for (const column of layout.availableColumns) {
        for (let rowIndex = Math.max(layout.dataStartRow - 1, 0); rowIndex < rows.length; rowIndex += 1) {
            const text = String(rows[rowIndex]?.[column.index] ?? '').trim()
            if (text) {
                samples.set(column.index, text)
                break
            }
        }
        if (!samples.has(column.index)) samples.set(column.index, '')
    }
    return samples
}

export default function ImportPage() {
    const supabase = createClient()
    const fileRef = useRef<HTMLInputElement>(null)
    const { checking: checkingRole } = useRoleGuard(['admin', 'dcc', 'qc'])
    const [file, setFile] = useState<File | null>(null)
    const [workbookSource, setWorkbookSource] = useState<ImportWorkbookSource | null>(null)
    const [layout, setLayout] = useState<ImportLayoutConfig | null>(null)
    const [preview, setPreview] = useState<PreviewRow[]>([])
    const [preparedRows, setPreparedRows] = useState<WeldUpsertRow[]>([])
    const [parseIssues, setParseIssues] = useState<string[]>([])
    const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWeldWarning[]>([])
    const [duplicateMode, setDuplicateMode] = useState<DuplicateWeldHandlingMode>('separate')
    const [showManualMapping, setShowManualMapping] = useState(false)
    const [importing, setImporting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState<ImportResult | null>(null)
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
    const [currentProjectCode, setCurrentProjectCode] = useState('')
    const columnSamples = collectColumnSamples(workbookSource, layout)
    const missingRequiredFields = layout ? IMPORT_FIELD_DEFINITIONS.filter((field) => field.required && layout.fieldToColumn[field.key] == null) : []

    useEffect(() => {
        if (typeof window === 'undefined') return
        const syncProject = () => {
            const projectId = readActiveProjectIdFromCookie()
            setCurrentProjectId(projectId)
            if (!projectId) setCurrentProjectCode('')
        }
        syncProject()
        window.addEventListener(PROJECT_CHANGE_EVENT, syncProject)
        window.addEventListener('focus', syncProject)
        return () => {
            window.removeEventListener(PROJECT_CHANGE_EVENT, syncProject)
            window.removeEventListener('focus', syncProject)
        }
    }, [])

    useEffect(() => {
        if (!currentProjectId) return
        let mounted = true
        supabase.from('projects').select('code, name').eq('id', currentProjectId).single().then(({ data }) => {
            if (!mounted) return
            const project = data as { code: string; name: string } | null
            if (project) setCurrentProjectCode(`${project.code} — ${project.name}`)
        })
        return () => {
            mounted = false
        }
    }, [currentProjectId, supabase])

    useEffect(() => {
        if (!workbookSource || !layout) {
            setPreview([])
            setPreparedRows([])
            setParseIssues([])
            setDuplicateWarnings([])
            return
        }
        const parsed = parseWorkbookData(workbookSource, layout, currentProjectId, duplicateMode)
        setPreview(parsed.preview)
        setPreparedRows(parsed.rows)
        setParseIssues(parsed.issues)
        setDuplicateWarnings(parsed.duplicateWarnings)
    }, [currentProjectId, duplicateMode, layout, workbookSource])

    const updateLayout = (updater: (current: ImportLayoutConfig) => ImportLayoutConfig) => {
        setLayout((current) => {
            if (!current || !workbookSource) return current
            const next = updater(current)
            return cloneLayoutWithColumns(next, workbookSource.sheets[next.sheetName] || [])
        })
        setResult(null)
    }

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0]
        if (!nextFile) return
        try {
            const source = readWorkbookSource(await nextFile.arrayBuffer(), nextFile.name)
            const detectedLayout = detectWorkbookLayout(source)
            setFile(nextFile)
            setWorkbookSource(source)
            setLayout(detectedLayout)
            setDuplicateMode('separate')
            setShowManualMapping(detectedLayout.profileId === 'manual' || detectedLayout.issues.length > 0)
            setResult(null)
            setProgress(0)
        } catch (error) {
            alert(`Không đọc được file Excel: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    const handleImport = async () => {
        if (!layout || !currentProjectId || preparedRows.length === 0) return
        setImporting(true)
        setResult(null)
        setProgress(0)
        try {
            const weldTable = supabase.from('welds') as unknown as WeldUpsertTable
            let success = 0
            let errors = 0
            const messages: string[] = []
            for (let index = 0; index < preparedRows.length; index += BATCH_SIZE) {
                const batch = preparedRows.slice(index, index + BATCH_SIZE)
                const { error } = await weldTable.upsert(batch, { onConflict: 'project_id,weld_id' })
                if (error) {
                    messages.push(`Batch ${Math.floor(index / BATCH_SIZE) + 1}: ${error.message}`)
                    errors += batch.length
                    break
                }
                success += batch.length
                setProgress(Math.round(((index + batch.length) / preparedRows.length) * 100))
            }
            setResult({ success, errors, messages })
        } catch (error) {
            setResult({ success: 0, errors: preparedRows.length, messages: [error instanceof Error ? error.message : String(error)] })
        } finally {
            setImporting(false)
        }
    }

    if (checkingRole) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang kiểm tra quyền truy cập...</div>

    return (
        <div className="page-enter">
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Import từ Excel</h1>
                <p style={{ color: '#64748b', marginTop: 4 }}>Người import có thể tự gán lại “cột Excel → chức năng hệ thống” nếu auto detect chưa đúng.</p>
            </div>
            <div style={{ background: currentProjectId ? '#dcfce7' : '#fee2e2', border: `1px solid ${currentProjectId ? '#86efac' : '#fca5a5'}`, borderRadius: 8, padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ fontWeight: 600, color: currentProjectId ? '#166534' : '#b91c1c' }}>{currentProjectId ? 'Dự án nhận dữ liệu import' : 'Chưa chọn dự án'}</div>
                <div style={{ color: currentProjectId ? '#15803d' : '#dc2626', fontSize: '0.875rem' }}>{currentProjectId ? currentProjectCode || currentProjectId : 'Vui lòng chọn dự án ở menu bên trái trước khi import.'}</div>
            </div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <h3 style={{ color: '#1e40af', marginBottom: 12, fontWeight: 600 }}>Hướng dẫn import</h3>
                <ol style={{ color: '#1e40af', paddingLeft: 20, lineHeight: '1.8' }}>
                    <li>Chọn file Excel của dự án, ưu tiên sheet chứa dữ liệu gốc mối hàn.</li>
                    <li>Hệ thống sẽ thử nhận diện template TNHA hoặc RC&amp;BK.</li>
                    <li>Nếu auto map chưa đúng, mở mapping thủ công để đổi từng cột Excel sang đúng chức năng.</li>
                    <li>Preview và bảng mapping đều có thanh cuộn ngang để kiểm tra dễ hơn trên màn hình hẹp.</li>
                </ol>
            </div>
            <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontWeight: 600, marginBottom: 16 }}>1. Chọn file Excel</h3>
                <div style={{ border: '2px dashed #e2e8f0', borderRadius: 10, padding: 32, textAlign: 'center', cursor: 'pointer', background: '#f8fafc' }} onClick={() => fileRef.current?.click()}>
                    <div style={{ fontSize: '3rem', marginBottom: 8 }}>📂</div>
                    <p style={{ color: '#64748b', marginBottom: 4 }}>Bấm để chọn file hoặc kéo thả vào đây</p>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Hỗ trợ: .xlsx, .xls</p>
                    {file && <p style={{ color: '#22c55e', marginTop: 8, fontWeight: 600 }}>Đã chọn: {file.name}</p>}
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>
            {workbookSource && layout && <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                    <div>
                        <h3 style={{ fontWeight: 600, marginBottom: 6 }}>2. Nhận diện template và mapping</h3>
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Template: <strong>{layout.profileLabel}</strong> • Sheet: <strong>{layout.sheetName}</strong> • Độ tin cậy: <strong>{Math.round(layout.confidence * 100)}%</strong></p>
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Đã map <strong>{mappingCoverage(layout)}</strong> / <strong>{IMPORT_FIELD_DEFINITIONS.length}</strong> trường.</p>
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowManualMapping((value) => !value)}>{showManualMapping ? 'Ẩn mapping thủ công' : 'Mở mapping thủ công'}</button>
                </div>
                {([...layout.issues, ...parseIssues]).length > 0 && <div style={{ marginBottom: 16, padding: '12px 14px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10 }}>{[...layout.issues, ...parseIssues].map((issue, index) => <div key={`${issue}-${index}`} style={{ color: '#92400e', fontSize: '0.875rem' }}>• {issue}</div>)}</div>}
                {duplicateWarnings.length > 0 && <div style={{ marginBottom: 16, padding: 16, background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 12 }}>
                    <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 8 }}>Phát hiện mối hàn trùng tên hiển thị</div>
                    <p style={{ color: '#1e3a8a', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: 12 }}>
                        Đây thường là các trường hợp kiểu <strong>1PCS / padeye / item không có số mối hàn riêng</strong>. ID nội bộ thật của hệ thống vẫn là <strong>UUID</strong>; lựa chọn dưới đây chỉ quyết định cách tạo <strong>khóa import/upsert</strong> cho các dòng trùng tên hiển thị trong file.
                    </p>
                    <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, border: `1px solid ${duplicateMode === 'separate' ? '#2563eb' : '#cbd5e1'}`, borderRadius: 10, background: duplicateMode === 'separate' ? '#dbeafe' : 'white', cursor: 'pointer' }}>
                            <input type="radio" name="duplicate-mode" checked={duplicateMode === 'separate'} onChange={() => setDuplicateMode('separate')} />
                            <span style={{ color: '#0f172a', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                <strong>Tách riêng từng dòng</strong> (khuyến nghị)
                                <br />
                                Hệ thống giữ từng dòng Excel là một bản ghi riêng, tự tạo khóa import ẩn nếu trùng tên hiển thị.
                            </span>
                        </label>
                        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, border: `1px solid ${duplicateMode === 'merge' ? '#2563eb' : '#cbd5e1'}`, borderRadius: 10, background: duplicateMode === 'merge' ? '#dbeafe' : 'white', cursor: 'pointer' }}>
                            <input type="radio" name="duplicate-mode" checked={duplicateMode === 'merge'} onChange={() => setDuplicateMode('merge')} />
                            <span style={{ color: '#0f172a', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                <strong>Gộp các dòng cùng tên hiển thị</strong>
                                <br />
                                Chỉ dùng khi mày chắc chắn đó là dữ liệu lặp thật và muốn upsert thành một bản ghi.
                            </span>
                        </label>
                    </div>
                    <div style={{ color: '#334155', fontSize: '0.85rem', marginBottom: 8 }}>Các nhóm cần xem xét trước khi import:</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {duplicateWarnings.slice(0, 8).map((warning) => (
                            <div key={`${warning.displayWeldId}-${warning.firstRow}-${warning.latestRow}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 8, background: 'white', border: '1px solid #dbeafe' }}>
                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{warning.displayWeldId}</div>
                                <div style={{ color: '#475569', fontSize: '0.85rem' }}>
                                    {warning.occurrences} dòng • bắt đầu từ hàng {warning.firstRow} • gần nhất ở hàng {warning.latestRow}
                                </div>
                            </div>
                        ))}
                        {duplicateWarnings.length > 8 && <div style={{ color: '#475569', fontSize: '0.85rem' }}>Còn {duplicateWarnings.length - 8} nhóm nữa trong file.</div>}
                    </div>
                </div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: showManualMapping ? 16 : 0 }}>
                    <label style={{ display: 'grid', gap: 6 }}><span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sheet dữ liệu</span><select value={layout.sheetName} onChange={(event) => { const sheetName = event.target.value; const next = detectWorkbookLayout({ fileName: workbookSource.fileName, sheets: { [sheetName]: workbookSource.sheets[sheetName] || [] } }); setLayout(next); setShowManualMapping(true); setResult(null) }} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px' }}>{Object.keys(workbookSource.sheets).map((sheetName) => <option key={sheetName} value={sheetName}>{sheetName}</option>)}</select></label>
                    <label style={{ display: 'grid', gap: 6 }}><span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hàng header chính</span><input type="number" min={1} value={layout.headerRow} onChange={(event) => updateLayout((current) => ({ ...current, headerRow: Math.max(1, Number(event.target.value) || 1) }))} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px' }} /></label>
                    <label style={{ display: 'grid', gap: 6 }}><span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hàng sub-header</span><input type="number" min={0} value={layout.subHeaderRow ?? 0} onChange={(event) => updateLayout((current) => ({ ...current, subHeaderRow: Number(event.target.value) > 0 ? Number(event.target.value) : null }))} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px' }} /></label>
                    <label style={{ display: 'grid', gap: 6 }}><span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Bắt đầu dữ liệu từ hàng</span><input type="number" min={1} value={layout.dataStartRow} onChange={(event) => updateLayout((current) => ({ ...current, dataStartRow: Math.max(1, Number(event.target.value) || 1) }))} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px' }} /></label>
                </div>
                {showManualMapping && <details open style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#f8fafc' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Mapping cột thủ công</summary>
                    {missingRequiredFields.length > 0 && <div style={{ marginBottom: 16, padding: '10px 12px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, color: '#92400e', fontSize: '0.875rem' }}>Còn thiếu các cột bắt buộc: <strong>{missingRequiredFields.map((field) => field.label).join(', ')}</strong></div>}
                    <SyncedTableFrame><table style={{ minWidth: '1500px', fontSize: '0.82rem' }}><thead><tr><th>Cột Excel</th><th>Header chính</th><th>Sub-header</th><th>Mẫu giá trị</th><th>Gán chức năng</th></tr></thead><tbody>{layout.availableColumns.map((column) => <tr key={column.index}><td style={{ fontWeight: 700 }}>{column.excelColumn}</td><td>{column.topLabel || '—'}</td><td>{column.subLabel || '—'}</td><td title={columnSamples.get(column.index) || ''}>{columnSamples.get(column.index) || '—'}</td><td><select value={findAssignedField(layout, column.index)} onChange={(event) => updateLayout((current) => assignFieldToColumn(current, column.index, (event.target.value || '') as ImportFieldKey | ''))} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', background: 'white' }}><option value="">— Không gán chức năng —</option>{IMPORT_FIELD_DEFINITIONS.map((field) => <option key={`${column.index}-${field.key}`} value={field.key}>{field.label}{field.required ? ' *' : ''}</option>)}</select></td></tr>)}</tbody></table></SyncedTableFrame>
                </details>}
            </div>}
            {preview.length > 0 && <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                    <h3 style={{ fontWeight: 600 }}>3. Preview 10 dòng đầu</h3>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        Preview đọc được <strong>{preview.length}</strong> dòng đầu • dự kiến import <strong>{preparedRows.length}</strong> bản ghi
                    </div>
                </div>
                <SyncedTableFrame><table style={{ fontSize: '0.73rem', minWidth: '2200px' }}><thead><tr>{PREVIEW_COLUMNS.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead><tbody>{preview.map((row, rowIndex) => <tr key={`${row.weld_id}-${rowIndex}`}>{PREVIEW_COLUMNS.map((column) => <td key={`${row.weld_id}-${column.label}`}>{column.render(row)}</td>)}</tr>)}</tbody></table></SyncedTableFrame>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 8 }}>Preview chỉ hiển thị 10 dòng đầu. Toàn bộ dữ liệu hợp lệ sẽ được import khi bấm nút bên dưới.</p>
            </div>}
            {file && layout && <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontWeight: 600, marginBottom: 16 }}>4. Bắt đầu import</h3>
                {importing && <div style={{ marginBottom: 16, color: '#374151', fontSize: '0.875rem' }}>Đang import... {progress}%</div>}
                <button onClick={handleImport} disabled={importing || preparedRows.length === 0 || !currentProjectId} className="btn btn-primary" style={{ fontSize: '1rem', padding: '12px 32px' }}>{importing ? `Đang import (${progress}%)...` : 'Import vào Database'}</button>
            </div>}
            {result && <div style={{ background: 'white', borderRadius: 12, padding: 24, marginTop: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Kết quả import</h3>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ padding: '16px 24px', background: '#dcfce7', borderRadius: 8 }}><div style={{ fontSize: '2rem', fontWeight: 700, color: '#166534' }}>{result.success}</div><div style={{ color: '#166534', fontSize: '0.875rem' }}>Thành công</div></div>
                    <div style={{ padding: '16px 24px', background: '#fee2e2', borderRadius: 8 }}><div style={{ fontSize: '2rem', fontWeight: 700, color: '#991b1b' }}>{result.errors}</div><div style={{ color: '#991b1b', fontSize: '0.875rem' }}>Lỗi</div></div>
                </div>
                {result.messages.length > 0 && <div style={{ marginTop: 12, padding: 12, background: '#fef9c3', borderRadius: 8 }}>{result.messages.map((message, index) => <p key={`${message}-${index}`} style={{ fontSize: '0.8rem', color: '#92400e' }}>{message}</p>)}</div>}
                {result.success > 0 && <Link href="/welds" className="btn btn-primary" style={{ marginTop: 12, display: 'inline-flex' }}>Xem danh sách mối hàn →</Link>}
            </div>}
        </div>
    )
}
