'use client'

import Link from 'next/link'
import { ChangeEvent, useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { formatNumber } from '@/lib/formatters'
import {
    cloneLayoutWithColumns,
    detectWorkbookLayout,
    IMPORT_FIELD_DEFINITIONS,
    ImportLayoutConfig,
    ImportWorkbookSource,
    parseWorkbookData,
    PreviewRow,
    WeldUpsertRow,
} from '@/lib/excel-import'
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

const BATCH_SIZE = 50

function readWorkbookSource(fileData: ArrayBuffer, fileName: string): ImportWorkbookSource {
    const workbook = XLSX.read(new Uint8Array(fileData), { type: 'array', cellDates: true })
    const sheets: Record<string, unknown[][]> = {}

    for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName]
        sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as unknown[][]
    }

    return { fileName, sheets }
}

function mappingCoverage(layout: ImportLayoutConfig) {
    return IMPORT_FIELD_DEFINITIONS.filter((field) => layout.fieldToColumn[field.key] != null).length
}

export default function ImportPage() {
    const supabase = createClient()
    const fileRef = useRef<HTMLInputElement>(null)

    const [file, setFile] = useState<File | null>(null)
    const [workbookSource, setWorkbookSource] = useState<ImportWorkbookSource | null>(null)
    const [layout, setLayout] = useState<ImportLayoutConfig | null>(null)
    const [preview, setPreview] = useState<PreviewRow[]>([])
    const [preparedRows, setPreparedRows] = useState<WeldUpsertRow[]>([])
    const [parseIssues, setParseIssues] = useState<string[]>([])
    const [showManualMapping, setShowManualMapping] = useState(false)
    const [importing, setImporting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState<ImportResult | null>(null)
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
    const [currentProjectCode, setCurrentProjectCode] = useState('')
    const { checking: checkingRole } = useRoleGuard(['admin', 'dcc', 'qc'])

    useEffect(() => {
        if (typeof window === 'undefined') return

        const syncProject = () => {
            const nextProjectId = readActiveProjectIdFromCookie()
            setCurrentProjectId(nextProjectId)
            if (!nextProjectId) {
                setCurrentProjectCode('')
            }
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

        let isMounted = true
        supabase
            .from('projects')
            .select('code, name')
            .eq('id', currentProjectId)
            .single()
            .then(({ data }) => {
                if (!isMounted) return
                const project = data as { code: string; name: string } | null
                if (project) {
                    setCurrentProjectCode(`${project.code} — ${project.name}`)
                }
            })

        return () => {
            isMounted = false
        }
    }, [currentProjectId, supabase])

    useEffect(() => {
        if (!workbookSource || !layout) {
            setPreview([])
            setPreparedRows([])
            setParseIssues([])
            return
        }

        const parsed = parseWorkbookData(workbookSource, layout, currentProjectId)
        setPreview(parsed.preview)
        setPreparedRows(parsed.rows)
        setParseIssues(parsed.issues)
    }, [currentProjectId, layout, workbookSource])

    if (checkingRole) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Đang kiểm tra quyền truy cập...
            </div>
        )
    }

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0]
        if (!nextFile) return

        try {
            const buffer = await nextFile.arrayBuffer()
            const source = readWorkbookSource(buffer, nextFile.name)
            const detectedLayout = detectWorkbookLayout(source)

            setFile(nextFile)
            setWorkbookSource(source)
            setLayout(detectedLayout)
            setShowManualMapping(detectedLayout.profileId === 'manual' || detectedLayout.issues.length > 0)
            setResult(null)
            setProgress(0)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            alert(`Không đọc được file Excel: ${message}`)
        }
    }

    const handleSheetChange = (sheetName: string) => {
        if (!workbookSource) return

        const singleSheetSource: ImportWorkbookSource = {
            fileName: workbookSource.fileName,
            sheets: {
                [sheetName]: workbookSource.sheets[sheetName] || [],
            },
        }

        const detectedLayout = detectWorkbookLayout(singleSheetSource)
        setLayout(detectedLayout)
        setShowManualMapping(true)
        setResult(null)
    }

    const updateLayout = (updater: (current: ImportLayoutConfig) => ImportLayoutConfig) => {
        setLayout((current) => {
            if (!current || !workbookSource) return current
            const next = updater(current)
            const rawData = workbookSource.sheets[next.sheetName] || []
            return cloneLayoutWithColumns(next, rawData)
        })
        setResult(null)
    }

    const handleImport = async () => {
        if (!file || !layout) return

        if (!currentProjectId) {
            alert('Bạn chưa chọn dự án. Hãy chọn dự án ở menu bên trái trước khi import.')
            return
        }

        if (preparedRows.length === 0) {
            alert('Không có dòng dữ liệu hợp lệ để import. Hãy kiểm tra lại mapping cột hoặc sheet dữ liệu.')
            return
        }

        setImporting(true)
        setResult(null)
        setProgress(0)

        try {
            const weldTable = supabase.from('welds') as unknown as WeldUpsertTable
            let successCount = 0
            let errorCount = 0
            const messages: string[] = []

            for (let index = 0; index < preparedRows.length; index += BATCH_SIZE) {
                const batch = preparedRows.slice(index, index + BATCH_SIZE)
                const { error } = await weldTable.upsert(batch, { onConflict: 'project_id,weld_id' })

                if (error) {
                    messages.push(`Batch ${Math.floor(index / BATCH_SIZE) + 1}: ${error.message}`)
                    errorCount += batch.length
                    break
                }

                successCount += batch.length
                setProgress(Math.round(((index + batch.length) / preparedRows.length) * 100))
            }

            setResult({ success: successCount, errors: errorCount, messages })
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            setResult({ success: 0, errors: preparedRows.length, messages: [message] })
        } finally {
            setImporting(false)
        }
    }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Import từ Excel</h1>
                <p style={{ color: '#64748b', marginTop: '4px' }}>
                    Hệ thống sẽ tự nhận diện template import. Nếu file khác chuẩn, người dùng có thể map lại sheet, header và cột ngay tại đây.
                </p>
            </div>

            {!currentProjectId ? (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight: 600, color: '#b91c1c' }}>Chưa chọn dự án</div>
                        <div style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                            Vui lòng chọn dự án ở menu bên trái trước khi import. Dữ liệu sẽ được gắn vào dự án đang chọn.
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.5rem' }}>✅</span>
                    <div>
                        <div style={{ fontWeight: 600, color: '#166534' }}>Dự án nhận dữ liệu import</div>
                        <div style={{ color: '#15803d', fontSize: '0.875rem' }}>{currentProjectCode || currentProjectId}</div>
                    </div>
                </div>
            )}

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <h3 style={{ color: '#1e40af', marginBottom: '12px', fontWeight: 600 }}>Hướng dẫn import</h3>
                <ol style={{ color: '#1e40af', paddingLeft: '20px', lineHeight: '1.8' }}>
                    <li>Chọn file Excel bất kỳ của dự án, ưu tiên sheet chứa dữ liệu gốc mối hàn.</li>
                    <li>Hệ thống sẽ thử tự nhận diện template TNHA hoặc RC&amp;BK.</li>
                    <li>Nếu nhận diện chưa chuẩn, mở phần <strong>mapping thủ công</strong> để chỉ cho hệ thống cột nào là nội dung nào.</li>
                    <li>Kiểm tra preview 10 dòng đầu trước khi import thật.</li>
                    <li>Import dùng cơ chế upsert theo <strong>project_id + weld_id</strong>, dữ liệu trùng sẽ được cập nhật.</li>
                </ol>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>1. Chọn file Excel</h3>
                <div
                    style={{
                        border: '2px dashed #e2e8f0',
                        borderRadius: '10px',
                        padding: '32px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: '#f8fafc',
                    }}
                    onClick={() => fileRef.current?.click()}
                >
                    <div style={{ fontSize: '3rem', marginBottom: '8px' }}>📂</div>
                    <p style={{ color: '#64748b', marginBottom: '4px' }}>Bấm để chọn file hoặc kéo thả vào đây</p>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Hỗ trợ: .xlsx, .xls</p>
                    {file && <p style={{ color: '#22c55e', marginTop: '8px', fontWeight: 600 }}>✅ Đã chọn: {file.name}</p>}
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            {workbookSource && layout && (
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ fontWeight: 600, marginBottom: '6px' }}>2. Nhận diện template và mapping</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                Template nhận diện: <strong>{layout.profileLabel}</strong> • Sheet: <strong>{layout.sheetName}</strong> • Độ tin cậy: <strong>{Math.round(layout.confidence * 100)}%</strong>
                            </p>
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                Đã map <strong>{mappingCoverage(layout)}</strong> / <strong>{IMPORT_FIELD_DEFINITIONS.length}</strong> trường.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowManualMapping((current) => !current)}
                        >
                            {showManualMapping ? 'Ẩn mapping thủ công' : 'Mở mapping thủ công'}
                        </button>
                    </div>

                    {(layout.issues.length > 0 || parseIssues.length > 0) && (
                        <div style={{ marginBottom: '16px', padding: '12px 14px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px' }}>
                            <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '6px' }}>Lưu ý nhận diện</div>
                            {[...layout.issues, ...parseIssues].map((issue, index) => (
                                <div key={`${issue}-${index}`} style={{ color: '#92400e', fontSize: '0.875rem' }}>
                                    • {issue}
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: showManualMapping ? '16px' : 0 }}>
                        <label style={{ display: 'grid', gap: '6px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sheet dữ liệu</span>
                            <select
                                value={layout.sheetName}
                                onChange={(event) => handleSheetChange(event.target.value)}
                                style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px' }}
                            >
                                {Object.keys(workbookSource.sheets).map((sheetName) => (
                                    <option key={sheetName} value={sheetName}>
                                        {sheetName}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label style={{ display: 'grid', gap: '6px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hàng header chính</span>
                            <input
                                type="number"
                                min={1}
                                value={layout.headerRow}
                                onChange={(event) =>
                                    updateLayout((current) => ({
                                        ...current,
                                        headerRow: Math.max(1, Number(event.target.value) || 1),
                                    }))
                                }
                                style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px' }}
                            />
                        </label>
                        <label style={{ display: 'grid', gap: '6px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hàng sub-header</span>
                            <input
                                type="number"
                                min={0}
                                value={layout.subHeaderRow ?? 0}
                                onChange={(event) =>
                                    updateLayout((current) => ({
                                        ...current,
                                        subHeaderRow: Number(event.target.value) > 0 ? Number(event.target.value) : null,
                                    }))
                                }
                                style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px' }}
                            />
                        </label>
                        <label style={{ display: 'grid', gap: '6px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Bắt đầu dữ liệu từ hàng</span>
                            <input
                                type="number"
                                min={1}
                                value={layout.dataStartRow}
                                onChange={(event) =>
                                    updateLayout((current) => ({
                                        ...current,
                                        dataStartRow: Math.max(1, Number(event.target.value) || 1),
                                    }))
                                }
                                style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px' }}
                            />
                        </label>
                    </div>

                    {showManualMapping && (
                        <details open style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#f8fafc' }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                                Mapping cột thủ công
                            </summary>
                            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '16px' }}>
                                Dùng khi file không theo đúng template đã biết. Cột có dấu * là cột bắt buộc để import.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
                                {IMPORT_FIELD_DEFINITIONS.map((field) => (
                                    <label key={field.key} style={{ display: 'grid', gap: '6px' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                            {field.label}
                                            {field.required ? ' *' : ''}
                                        </span>
                                        <select
                                            value={layout.fieldToColumn[field.key] ?? -1}
                                            onChange={(event) =>
                                                updateLayout((current) => ({
                                                    ...current,
                                                    fieldToColumn: {
                                                        ...current.fieldToColumn,
                                                        [field.key]: Number(event.target.value) >= 0 ? Number(event.target.value) : undefined,
                                                    },
                                                }))
                                            }
                                            style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px' }}
                                        >
                                            <option value={-1}>— Không map —</option>
                                            {layout.availableColumns.map((column) => (
                                                <option key={`${field.key}-${column.index}`} value={column.index}>
                                                    {column.excelColumn} — {column.combinedLabel}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                ))}
                            </div>
                        </details>
                    )}
                </div>
            )}

            {preview.length > 0 && (
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                        <h3 style={{ fontWeight: 600 }}>3. Preview 10 dòng đầu</h3>
                        <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                            Nhận diện được <strong>{preparedRows.length}</strong> dòng dữ liệu hợp lệ
                        </div>
                    </div>
                    <div className="table-container">
                        <table style={{ fontSize: '0.73rem', minWidth: '1800px' }}>
                            <thead>
                                <tr>
                                    <th>Weld ID</th>
                                    <th>Drawing</th>
                                    <th>Weld No</th>
                                    <th>Nhóm mối hàn</th>
                                    <th>Loại / Cấu hình</th>
                                    <th>NDT</th>
                                    <th>Position</th>
                                    <th>Length</th>
                                    <th>Thick</th>
                                    <th>Thick LC</th>
                                    <th>WPS</th>
                                    <th>GOC Code</th>
                                    <th>QC Fit-up</th>
                                    <th>Fit-up Date</th>
                                    <th>Fit-up RQ</th>
                                    <th>Finish Date</th>
                                    <th>Welders</th>
                                    <th>QC Visual</th>
                                    <th>Visual Date</th>
                                    <th>NDT/Visual RQ</th>
                                    <th>BG Date</th>
                                    <th>BG Request</th>
                                    <th>MT</th>
                                    <th>MT Report</th>
                                    <th>UT</th>
                                    <th>UT Report</th>
                                    <th>RT</th>
                                    <th>Release Note</th>
                                    <th>Release Date</th>
                                    <th>Stage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, index) => (
                                    <tr key={`${row.weld_id}-${index}`}>
                                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{row.weld_id}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.drawing_no}</td>
                                        <td style={{ textAlign: 'center' }}>{row.weld_no}</td>
                                        <td style={{ fontWeight: 600 }}>{row.joint_family}</td>
                                        <td style={{ fontWeight: 600 }}>{row.joint_type}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.ndt_requirements}</td>
                                        <td style={{ textAlign: 'center' }}>{row.position}</td>
                                        <td style={{ textAlign: 'right' }}>{formatNumber(row.weld_length)}</td>
                                        <td style={{ textAlign: 'right' }}>{row.thickness}</td>
                                        <td style={{ textAlign: 'right', color: '#64748b' }}>{row.thickness_lamcheck}</td>
                                        <td style={{ color: '#6366f1' }}>{row.wps_no}</td>
                                        <td><span style={{ padding: '1px 4px', background: '#f1f5f9', borderRadius: '3px' }}>{row.goc_code || '—'}</span></td>
                                        <td>{row.fitup_inspector || '—'}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.fitup_date || '—'}</td>
                                        <td>{row.fitup_request_no || '—'}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.weld_finish_date || '—'}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{row.welders || '—'}</td>
                                        <td>{row.visual_inspector || '—'}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.visual_date || '—'}</td>
                                        <td>{row.inspection_request_no || '—'}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.backgouge_date || '—'}</td>
                                        <td>{row.backgouge_request_no || '—'}</td>
                                        <td>{row.mt_result || '—'}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.mt_report_no || '—'}</td>
                                        <td>{row.ut_result || '—'}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.ut_report_no || '—'}</td>
                                        <td>{row.rt_result || '—'}</td>
                                        <td style={{ fontWeight: 600, color: '#0369a1', whiteSpace: 'nowrap' }}>{row.release_note_no || '—'}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.release_note_date || '—'}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{row.stage}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '8px' }}>
                        Preview chỉ hiển thị 10 dòng đầu. Toàn bộ dữ liệu hợp lệ sẽ được import khi bấm nút bên dưới.
                    </p>
                </div>
            )}

            {file && layout && (
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>4. Bắt đầu import</h3>
                    {importing && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.875rem', color: '#374151' }}>Đang import...</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{progress}%</span>
                            </div>
                            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)', transition: 'width 0.3s' }} />
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleImport}
                        disabled={importing || preparedRows.length === 0 || !currentProjectId}
                        className="btn btn-primary"
                        style={{ fontSize: '1rem', padding: '12px 32px' }}
                    >
                        {importing ? `Đang import (${progress}%)...` : 'Import vào Database'}
                    </button>
                </div>
            )}

            {result && (
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '12px' }}>Kết quả import</h3>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ padding: '16px 24px', background: '#dcfce7', borderRadius: '8px' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#166534' }}>{result.success}</div>
                            <div style={{ color: '#166534', fontSize: '0.875rem' }}>Thành công</div>
                        </div>
                        <div style={{ padding: '16px 24px', background: '#fee2e2', borderRadius: '8px' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#991b1b' }}>{result.errors}</div>
                            <div style={{ color: '#991b1b', fontSize: '0.875rem' }}>Lỗi</div>
                        </div>
                    </div>
                    {result.messages.length > 0 && (
                        <div style={{ marginTop: '12px', padding: '12px', background: '#fef9c3', borderRadius: '8px' }}>
                            <p style={{ fontWeight: 600, marginBottom: '4px' }}>Chi tiết lỗi:</p>
                            {result.messages.map((message, index) => (
                                <p key={`${message}-${index}`} style={{ fontSize: '0.8rem', color: '#92400e' }}>
                                    {message}
                                </p>
                            ))}
                        </div>
                    )}
                    {result.success > 0 && (
                        <Link href="/welds" className="btn btn-primary" style={{ marginTop: '12px', display: 'inline-flex' }}>
                            Xem danh sách mối hàn →
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}
