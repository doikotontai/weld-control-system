'use client'
// app/(dashboard)/import/page.tsx — Import Excel
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'

interface PreviewRow {
    weld_id: string
    drawing_no: string
    weld_no: string
    joint_type: string
    ndt_requirements: string
    wps_no: string
    goc_code: string
    weld_length: number | null
    thickness: number | null
    welders: string
    fitup_request_no: string
    mt_result: string
    ut_result: string
    mt_report_no: string
    ut_report_no: string
    stage: string
}

// Mapping cột Excel DATA INPUT sang database
// Dựa trên phân tích file WELD CONTROL.xlsx
const COLUMN_MAP = {
    0: 'weld_id',          // Weld ID full
    1: 'drawing_no',       // Drawing No.
    2: 'weld_no',          // Weld No.
    3: 'joint_type',       // Joint Type (X2, DB, DV...)
    4: 'position',         // Position
    5: 'ndt_requirements', // NDT Requirements
    6: 'category',         // Category
    7: 'weld_length',      // Length (mm)
    8: 'thickness',        // Thickness (mm)
    9: 'extra',            // Extra col
    10: 'wps_no',          // WPS No.
    11: 'goc_code',        // GOC Code
    12: 'fitup_inspector', // FitUp Inspector
    13: 'fitup_date',      // FitUp Date
    14: 'fitup_request_no', // FitUp Request No
    15: 'fitup_accepted',   // FitUp Accepted Date
    16: 'welders',          // Welders
    17: 'visual_inspector', // Visual Inspector
    18: 'visual_date',      // Visual Date
    19: 'visual_request_no', // Visual Request No
    20: 'backgouge_date',   // Backgouge Date
    21: 'backgouge_request_no', // Backgouge Request No
    22: 'pwht_col',         // PWHT col
    23: 'pwht_col2',        // PWHT result
    24: 'fitup_result',     // Fitup result
    25: 'visual_result',    // Visual result (FINISH/REJ/ACC)
    26: 'mt_result',        // MT result (ACC/REJ)
    27: 'mt_report_no',     // MT Report No
    28: 'ut_result',        // UT result (ACC/REJ)
    29: 'ut_report_no',     // UT Report No
}

function parseResult(val: unknown): string | null {
    if (!val) return null
    const s = String(val).toUpperCase().trim()
    if (s === 'ACC' || s === 'ACCEPT') return 'ACC'
    if (s === 'REJ' || s === 'REJECT') return 'REJ'
    if (s === 'N/A' || s === 'NA') return 'N/A'
    if (s === 'FINISH') return 'ACC'
    if (s === 'A') return 'ACC'
    return s || null
}

function parseStage(row: Record<string, unknown>): string {
    const mtResult = parseResult(row['mt_result'])
    const utResult = parseResult(row['ut_result'])
    const visualResult = parseResult(row['visual_result'])
    const fitupResult = parseResult(row['fitup_result'])

    if (mtResult === 'ACC' && utResult === 'ACC') return 'completed'
    if (mtResult === 'REJ' || utResult === 'REJ') return 'mpi'
    if (visualResult === 'ACC') return 'mpi'
    if (fitupResult === 'ACC' || fitupResult === 'FINISH') return 'visual'
    return 'fitup'
}

export default function ImportPage() {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<PreviewRow[]>([])
    const [importing, setImporting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState<{ success: number; errors: number; messages: string[] } | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (!f) return
        setFile(f)
        setResult(null)
        setProgress(0)

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array', cellDates: true })

                // Find DATA INPUT sheet
                const sheetName = workbook.SheetNames.find(n => n.includes('DATA INPUT') || n.includes('DATA'))
                if (!sheetName) {
                    alert('Không tìm thấy sheet "DATA INPUT"! Vui lòng kiểm tra file Excel.')
                    return
                }

                const ws = workbook.Sheets[sheetName]
                const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][]

                // Find header row (look for row containing weld IDs starting with numbers)
                const rows: PreviewRow[] = []
                for (let i = 0; i < rawData.length && rows.length < 10; i++) {
                    const row = rawData[i] as unknown[]
                    const weldId = String(row[0] || '')
                    // Detect data rows: weld_id matches pattern like "9001-XXXX" or similar
                    if (weldId && weldId.includes('-WM') && !weldId.startsWith('None')) {
                        const rowObj: Record<string, unknown> = {}
                        Object.entries(COLUMN_MAP).forEach(([idx, key]) => {
                            rowObj[key] = row[parseInt(idx)]
                        })

                        rows.push({
                            weld_id: weldId,
                            drawing_no: String(row[1] || ''),
                            weld_no: String(row[2] || ''),
                            joint_type: String(row[4] || ''),
                            ndt_requirements: String(row[5] || ''),
                            wps_no: String(row[10] || ''),
                            goc_code: String(row[11] || ''),
                            weld_length: row[7] ? parseFloat(String(row[7])) : null,
                            thickness: row[8] ? parseInt(String(row[8])) : null,
                            welders: String(row[16] || ''),
                            fitup_request_no: String(row[14] || ''),
                            mt_result: parseResult(row[26]) || '',
                            ut_result: parseResult(row[28]) || '',
                            mt_report_no: String(row[27] || ''),
                            ut_report_no: String(row[29] || ''),
                            stage: parseStage({ mt_result: row[26], ut_result: row[28], visual_result: row[25], fitup_result: row[24] }),
                        })
                    }
                }
                setPreview(rows)
            } catch (err) {
                alert(`Lỗi đọc file: ${err}`)
            }
        }
        reader.readAsArrayBuffer(f)
    }

    const handleImport = async () => {
        if (!file) return
        setImporting(true)
        setResult(null)
        setProgress(0)

        const reader = new FileReader()
        reader.onload = async (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array', cellDates: true })
                const sheetName = workbook.SheetNames.find(n => n.includes('DATA INPUT') || n.includes('DATA')) || ''
                const ws = workbook.Sheets[sheetName]
                const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][]

                // Get project
                const { data: project } = await supabase.from('projects').select('id').limit(1).single()
                if (!project) { alert('Không tìm thấy dự án!'); setImporting(false); return }

                let successCount = 0
                let errorCount = 0
                const errors: string[] = []
                const batchSize = 50
                const dataRows: Record<string, unknown>[] = []

                // Parse all rows
                for (const row of rawData as unknown[][]) {
                    const weldId = String(row[0] || '')
                    if (!weldId || !weldId.includes('-WM')) continue

                    const rowObj: Record<string, unknown> = {}
                    Object.entries(COLUMN_MAP).forEach(([idx, key]) => {
                        rowObj[key] = (row as unknown[])[parseInt(idx)]
                    })

                    const mtResult = parseResult(rowObj['mt_result'])
                    const utResult = parseResult(rowObj['ut_result'])

                    const weldData = {
                        project_id: project.id,
                        weld_id: weldId,
                        drawing_no: String(rowObj['drawing_no'] || ''),
                        weld_no: String(rowObj['weld_no'] || ''),
                        is_repair: weldId.includes('R') && /R\d/.test(weldId),
                        joint_type: String(rowObj['joint_type'] || '') || null,
                        ndt_requirements: String(rowObj['ndt_requirements'] || '') || null,
                        wps_no: String(rowObj['wps_no'] || '') || null,
                        goc_code: String(rowObj['goc_code'] || '') || null,
                        weld_length: rowObj['weld_length'] ? parseFloat(String(rowObj['weld_length'])) : null,
                        thickness: rowObj['thickness'] ? parseInt(String(rowObj['thickness'])) : null,
                        welders: String(rowObj['welders'] || '') || null,
                        fitup_request_no: String(rowObj['fitup_request_no'] || '') || null,
                        fitup_date: rowObj['fitup_date'] instanceof Date ? rowObj['fitup_date'].toISOString().slice(0, 10) : null,
                        visual_request_no: String(rowObj['visual_request_no'] || '') || null,
                        visual_date: rowObj['visual_date'] instanceof Date ? rowObj['visual_date'].toISOString().slice(0, 10) : null,
                        backgouge_request_no: String(rowObj['backgouge_request_no'] || '') || null,
                        backgouge_date: rowObj['backgouge_date'] instanceof Date ? rowObj['backgouge_date'].toISOString().slice(0, 10) : null,
                        mt_result: mtResult,
                        ut_result: utResult,
                        mt_report_no: String(rowObj['mt_report_no'] || '') || null,
                        ut_report_no: String(rowObj['ut_report_no'] || '') || null,
                        stage: parseStage(rowObj),
                        final_status: (mtResult === 'ACC' && utResult === 'ACC') ? 'OK' : null,
                    }
                    dataRows.push(weldData)
                }

                // Import in batches
                const total = dataRows.length
                for (let i = 0; i < dataRows.length; i += batchSize) {
                    const batch = dataRows.slice(i, i + batchSize)
                    const { error } = await supabase
                        .from('welds')
                        .upsert(batch, { onConflict: 'project_id,weld_id' })

                    if (error) {
                        errorCount += batch.length
                        errors.push(`Dòng ${i + 1}-${i + batch.length}: ${error.message}`)
                    } else {
                        successCount += batch.length
                    }
                    setProgress(Math.round(((i + batch.length) / total) * 100))
                }

                setResult({ success: successCount, errors: errorCount, messages: errors.slice(0, 5) })
            } catch (err) {
                alert(`Lỗi import: ${err}`)
            }
            setImporting(false)
        }
        reader.readAsArrayBuffer(file)
    }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>📥 Import từ Excel</h1>
                <p style={{ color: '#64748b', marginTop: '4px' }}>Import dữ liệu từ sheet DATA INPUT của file WELD CONTROL.xlsx</p>
            </div>

            {/* Instructions */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <h3 style={{ color: '#1e40af', marginBottom: '12px', fontWeight: 600 }}>📖 Hướng dẫn import</h3>
                <ol style={{ color: '#1e40af', paddingLeft: '20px', lineHeight: '1.8' }}>
                    <li>Mở file <strong>WELD CONTROL.xlsx</strong></li>
                    <li>Vào sheet <strong>DATA INPUT</strong></li>
                    <li>Chọn file Excel dưới đây (hệ thống tự đọc sheet DATA INPUT)</li>
                    <li>Xem preview dữ liệu — kiểm tra các cột có đúng không</li>
                    <li>Nhấn <strong>&quot;Import vào Database&quot;</strong> để nhập dữ liệu</li>
                    <li>Nếu mối hàn đã tồn tại → hệ thống sẽ <strong>cập nhật</strong> (upsert)</li>
                </ol>
            </div>

            {/* File Upload */}
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
                    <p style={{ color: '#64748b', marginBottom: '4px' }}>Click để chọn file hoặc kéo thả vào đây</p>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Hỗ trợ: .xlsx, .xls</p>
                    {file && <p style={{ color: '#22c55e', marginTop: '8px', fontWeight: 600 }}>✅ Đã chọn: {file.name}</p>}
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            {/* Preview */}
            {preview.length > 0 && (
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>2. Xem trước (Preview — 10 dòng đầu)</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Weld ID</th>
                                    <th>Bản vẽ</th>
                                    <th>Mối #</th>
                                    <th>Loại</th>
                                    <th>Thợ hàn</th>
                                    <th>MT</th>
                                    <th>UT</th>
                                    <th>Stage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, i) => (
                                    <tr key={i}>
                                        <td style={{ fontSize: '0.75rem' }}>{row.weld_id}</td>
                                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.drawing_no}</td>
                                        <td>{row.weld_no}</td>
                                        <td>{row.joint_type}</td>
                                        <td style={{ fontSize: '0.75rem' }}>{row.welders}</td>
                                        <td>
                                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: row.mt_result === 'ACC' ? '#dcfce7' : row.mt_result === 'REJ' ? '#fee2e2' : '#f1f5f9', color: row.mt_result === 'ACC' ? '#166534' : row.mt_result === 'REJ' ? '#991b1b' : '#64748b' }}>
                                                {row.mt_result || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: row.ut_result === 'ACC' ? '#dcfce7' : row.ut_result === 'REJ' ? '#fee2e2' : '#f1f5f9', color: row.ut_result === 'ACC' ? '#166534' : row.ut_result === 'REJ' ? '#991b1b' : '#64748b' }}>
                                                {row.ut_result || '—'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.75rem' }}>{row.stage}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '8px' }}>* Hiển thị 10 dòng đầu. Toàn bộ dữ liệu sẽ được import khi bấm nút bên dưới.</p>
                </div>
            )}

            {/* Import Button */}
            {file && preview.length > 0 && (
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>3. Bắt đầu Import</h3>
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
                        disabled={importing}
                        className="btn btn-primary"
                        style={{ fontSize: '1rem', padding: '12px 32px' }}
                    >
                        {importing ? `⏳ Đang import (${progress}%)...` : '🚀 Import vào Database'}
                    </button>
                </div>
            )}

            {/* Result */}
            {result && (
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '12px' }}>Kết quả Import</h3>
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
                            {result.messages.map((m, i) => <p key={i} style={{ fontSize: '0.8rem', color: '#92400e' }}>{m}</p>)}
                        </div>
                    )}
                    {result.success > 0 && (
                        <a href="/welds" className="btn btn-primary" style={{ marginTop: '12px', display: 'inline-flex' }}>
                            Xem danh sách mối hàn →
                        </a>
                    )}
                </div>
            )}
        </div>
    )
}
