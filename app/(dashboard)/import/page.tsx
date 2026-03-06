'use client'
// app/(dashboard)/import/page.tsx — Import Excel
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'

interface PreviewRow {
    weld_id: string
    drawing_no: string
    weld_no: string
    joint_family: string
    joint_type: string
    ndt_requirements: string
    position: string
    weld_length: number | null
    thickness: number | null
    thickness_lamcheck: number | null
    wps_no: string
    goc_code: string
    fitup_inspector: string
    fitup_date: string
    fitup_request_no: string
    fitup_accepted_date: string
    welders: string
    visual_inspector: string
    visual_date: string
    visual_request_no: string
    backgouge_date: string
    backgouge_request_no: string
    lamcheck_date: string
    lamcheck_request_no: string
    overall_status: string
    ndt_overall_result: string
    mt_result: string
    mt_report_no: string
    ut_result: string
    ut_report_no: string
    rt_result: string
    rt_report_no: string
    lamcheck_report_no: string
    defect_length: number | null
    repair_length: number | null
    final_visual_date: string
    final_visual_request_no: string
    irn_date: string
    irn_no: string
    pwht_result: string
    stage: string
}

// Cột trong DATA INPUT (dựa trên phân tích thực tế file WELD CONTROL.xlsx)
// ROW 1 headers + data rows từ ROW 3 onward
const COLUMN_MAP: Record<number, string> = {
    0: 'weld_id',               // Weld ID đầy đủ (e.g. 9001-2211-DS-0032-01-WM1)
    1: 'drawing_no',            // Drawing No
    2: 'weld_no',               // Weld No (số mối hàn trong bản vẽ)
    3: 'joint_family',          // Weld Joints family (X1, X2, X3, DB, SB...)
    4: 'joint_type',            // Weld Type (DB, DV, SB, SV...)
    5: 'ndt_requirements',      // NDT Requirements (100%MT & UT)
    6: 'position',              // OD/L Position (D=Diameter, L=Length)
    7: 'weld_length',           // Length (mm)
    8: 'thickness',             // Thickness (mm)
    9: 'thickness_lamcheck',    // Thick Lamcheck (mm)
    10: 'wps_no',                // WPS No.
    11: 'goc_code',              // GOC System Code
    12: 'fitup_inspector',       // Fit-Up QC Inspector name
    13: 'fitup_date',            // Fit-Up Date
    14: 'fitup_request_no',      // Fit-Up Request No (F-XXX)
    15: 'fitup_accepted_date',   // Fit-Up Finish Date (accepted)
    16: 'welders',               // Welders ID (BGT-0005;BGT-0015)
    17: 'visual_inspector',      // Visual QC Inspector name
    18: 'visual_date',           // Visual date
    19: 'visual_request_no',     // Visual Request No (V-XXX)
    20: 'backgouge_date',        // Back-Gouge date
    21: 'backgouge_request_no',  // Back-Gouge Request No (BG-XXX)
    22: 'lamcheck_date',         // Lamination Check date
    23: 'lamcheck_request_no',   // Lamination Check Request No (UL-XXX)
    24: 'overall_status',        // Overall Status (FINISH, REJ, ACC)
    25: 'ndt_overall_result',    // NDT Overall Result
    26: 'mt_result',             // MT/PT Result (ACC/REJ)
    27: 'mt_report_no',          // MT Report No (MT-2211-ST-22-XXXX)
    28: 'ut_result',             // UT/PAUT Result (ACC/REJ)
    29: 'ut_report_no',          // UT Report No (UT-2211-ST-22-XXXX)
    30: 'rt_result',             // RT Result
    31: 'rt_report_no',          // RT Report No
    32: 'lamcheck_report_no',    // Lamcheck Report No
    33: 'defect_length',         // Length Defect (mm)
    34: 'repair_length',         // Length Repaired (mm)
    35: 'final_visual_date',     // Date Release Final Visual
    36: 'final_visual_request_no', // RQ Final (FINAL-V-XXX or VS-XXX)
    37: 'irn_date',              // Date Release Note
    38: 'irn_no',                // Release Note / IRN No (IRN-2211-ST-22-XXXX)
    39: 'pwht_result',           // PWHT status
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

function parseDate(val: unknown): string | null {
    if (!val) return null
    if (val instanceof Date) return val.toISOString().slice(0, 10)
    // Try string like '30/10/2025' or '2025-10-30'
    const s = String(val).trim()
    // dd/mm/yyyy
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    // yyyy-mm-dd or just stringify a passable ISO string
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
    return null
}

function parseStage(row: Record<string, unknown>): string {
    const mtResult = parseResult(row['mt_result'])
    const utResult = parseResult(row['ut_result'])
    const overallStatus = String(row['overall_status'] || '').toUpperCase().trim()

    if (mtResult === 'ACC' && utResult === 'ACC') return 'completed'
    if (mtResult === 'REJ' || utResult === 'REJ') return 'mpi'
    if (overallStatus === 'FINISH' || overallStatus === 'ACC') return 'mpi'
    if (row['visual_date'] || row['visual_request_no']) return 'visual'
    if (row['fitup_accepted_date'] || row['fitup_request_no']) return 'welding'
    if (row['fitup_date'] || row['fitup_inspector']) return 'fitup'
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
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
    const [currentProjectCode, setCurrentProjectCode] = useState<string>('')

    // Read the globally selected project from cookie
    useEffect(() => {
        if (typeof document !== 'undefined') {
            const match = document.cookie.match(/(?:^|;)\s*weld-control-project-id=([^;]+)/)
            const pid = match ? match[1] : null
            setCurrentProjectId(pid)
            if (pid) {
                // Fetch project name to show in UI
                supabase.from('projects').select('code, name').eq('id', pid).single()
                    .then(({ data }) => {
                        const p = data as { code: string; name: string } | null
                        if (p) setCurrentProjectCode(`${p.code} \u2014 ${p.name}`)
                    })
            }
        }
    }, [])

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
                            drawing_no: String(rowObj['drawing_no'] || ''),
                            weld_no: String(rowObj['weld_no'] || ''),
                            joint_family: String(rowObj['joint_family'] || ''),
                            joint_type: String(rowObj['joint_type'] || ''),
                            ndt_requirements: String(rowObj['ndt_requirements'] || ''),
                            position: String(rowObj['position'] || ''),
                            weld_length: rowObj['weld_length'] ? parseFloat(String(rowObj['weld_length'])) : null,
                            thickness: rowObj['thickness'] ? parseInt(String(rowObj['thickness'])) : null,
                            thickness_lamcheck: rowObj['thickness_lamcheck'] ? parseFloat(String(rowObj['thickness_lamcheck'])) : null,
                            wps_no: String(rowObj['wps_no'] || ''),
                            goc_code: String(rowObj['goc_code'] || ''),
                            fitup_inspector: String(rowObj['fitup_inspector'] || ''),
                            fitup_date: parseDate(rowObj['fitup_date']) || '',
                            fitup_request_no: String(rowObj['fitup_request_no'] || ''),
                            fitup_accepted_date: parseDate(rowObj['fitup_accepted_date']) || '',
                            welders: String(rowObj['welders'] || ''),
                            visual_inspector: String(rowObj['visual_inspector'] || ''),
                            visual_date: parseDate(rowObj['visual_date']) || '',
                            visual_request_no: String(rowObj['visual_request_no'] || ''),
                            backgouge_date: parseDate(rowObj['backgouge_date']) || '',
                            backgouge_request_no: String(rowObj['backgouge_request_no'] || ''),
                            lamcheck_date: parseDate(rowObj['lamcheck_date']) || '',
                            lamcheck_request_no: String(rowObj['lamcheck_request_no'] || ''),
                            overall_status: String(rowObj['overall_status'] || ''),
                            ndt_overall_result: String(rowObj['ndt_overall_result'] || ''),
                            mt_result: parseResult(rowObj['mt_result']) || '',
                            mt_report_no: String(rowObj['mt_report_no'] || ''),
                            ut_result: parseResult(rowObj['ut_result']) || '',
                            ut_report_no: String(rowObj['ut_report_no'] || ''),
                            rt_result: parseResult(rowObj['rt_result']) || '',
                            rt_report_no: String(rowObj['rt_report_no'] || ''),
                            lamcheck_report_no: String(rowObj['lamcheck_report_no'] || ''),
                            defect_length: rowObj['defect_length'] ? parseFloat(String(rowObj['defect_length'])) : null,
                            repair_length: rowObj['repair_length'] ? parseFloat(String(rowObj['repair_length'])) : null,
                            final_visual_date: parseDate(rowObj['final_visual_date']) || '',
                            final_visual_request_no: String(rowObj['final_visual_request_no'] || ''),
                            irn_date: parseDate(rowObj['irn_date']) || '',
                            irn_no: String(rowObj['irn_no'] || ''),
                            pwht_result: String(rowObj['pwht_result'] || ''),
                            stage: parseStage(rowObj),
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

                // Get project from cookie-based global context
                const projectId = currentProjectId
                if (!projectId) { alert('Bạn chưa chọn Dự án! Hãy chọn Dự án ở menu trái trước khi Import.'); setImporting(false); return }

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
                        project_id: projectId,
                        weld_id: weldId,
                        drawing_no: String(rowObj['drawing_no'] || '') || null,
                        weld_no: rowObj['weld_no'] ? parseInt(String(rowObj['weld_no'])) : null,
                        is_repair: weldId.toUpperCase().includes('R') && /[A-Z]R\d/.test(weldId),
                        joint_family: String(rowObj['joint_family'] || '') || null,
                        joint_type: String(rowObj['joint_type'] || '') || null,
                        ndt_requirements: String(rowObj['ndt_requirements'] || '') || null,
                        position: String(rowObj['position'] || '') || null,
                        weld_length: rowObj['weld_length'] ? parseFloat(String(rowObj['weld_length'])) : null,
                        thickness: rowObj['thickness'] ? parseInt(String(rowObj['thickness'])) : null,
                        thickness_lamcheck: rowObj['thickness_lamcheck'] ? parseFloat(String(rowObj['thickness_lamcheck'])) : null,
                        wps_no: String(rowObj['wps_no'] || '') || null,
                        goc_code: String(rowObj['goc_code'] || '') || null,
                        fitup_inspector: String(rowObj['fitup_inspector'] || '') || null,
                        fitup_date: parseDate(rowObj['fitup_date']),
                        fitup_request_no: String(rowObj['fitup_request_no'] || '') || null,
                        fitup_accepted_date: parseDate(rowObj['fitup_accepted_date']),
                        welders: String(rowObj['welders'] || '') || null,
                        visual_inspector: String(rowObj['visual_inspector'] || '') || null,
                        visual_date: parseDate(rowObj['visual_date']),
                        visual_request_no: String(rowObj['visual_request_no'] || '') || null,
                        backgouge_date: parseDate(rowObj['backgouge_date']),
                        backgouge_request_no: String(rowObj['backgouge_request_no'] || '') || null,
                        lamcheck_date: parseDate(rowObj['lamcheck_date']),
                        lamcheck_request_no: String(rowObj['lamcheck_request_no'] || '') || null,
                        mt_result: mtResult,
                        ut_result: utResult,
                        mt_report_no: String(rowObj['mt_report_no'] || '') || null,
                        ut_report_no: String(rowObj['ut_report_no'] || '') || null,
                        rt_result: parseResult(rowObj['rt_result']),
                        rt_report_no: String(rowObj['rt_report_no'] || '') || null,
                        lamcheck_report_no: String(rowObj['lamcheck_report_no'] || '') || null,
                        defect_length: rowObj['defect_length'] ? parseFloat(String(rowObj['defect_length'])) : null,
                        repair_length: rowObj['repair_length'] ? parseFloat(String(rowObj['repair_length'])) : null,
                        irn_date: parseDate(rowObj['irn_date']),
                        irn_no: String(rowObj['irn_no'] || '') || null,
                        pwht_result: String(rowObj['pwht_result'] || '') || null,
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
                        .upsert(batch as any, { onConflict: 'project_id,weld_id' })

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

            {/* Project Context Banner */}
            {!currentProjectId ? (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight: 600, color: '#b91c1c' }}>Chưa chọn Dự án!</div>
                        <div style={{ color: '#dc2626', fontSize: '0.875rem' }}>Vui lòng chọn Dự án ở menu bên trái trước khi Import. Dữ liệu sẽ được gắn vào Dự án bạn chọn.</div>
                    </div>
                </div>
            ) : (
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.5rem' }}>✅</span>
                    <div>
                        <div style={{ fontWeight: 600, color: '#166534' }}>Dự án được Import</div>
                        <div style={{ color: '#15803d', fontSize: '0.875rem' }}>{currentProjectCode || currentProjectId}</div>
                    </div>
                </div>
            )}

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
                        <table style={{ fontSize: '0.73rem', minWidth: '1600px' }}>
                            <thead>
                                <tr>
                                    <th>Weld ID</th>
                                    <th>B\u1ea3n v\u1ebd</th>
                                    <th>M#</th>
                                    <th>Joints</th>
                                    <th>Type</th>
                                    <th>NDT Req</th>
                                    <th>GOC</th>
                                    <th>WPS</th>
                                    <th>D\u00e0i(mm)</th>
                                    <th>D\u00e0y</th>
                                    <th>Th\u1ee3 h\u00e0n</th>
                                    <th>FU QC</th>
                                    <th>FU Date</th>
                                    <th>FU Req</th>
                                    <th>VS QC</th>
                                    <th>VS Date</th>
                                    <th>VS Req</th>
                                    <th>BG Date</th>
                                    <th>BG Req</th>
                                    <th>MT</th>
                                    <th>MT Report</th>
                                    <th>UT</th>
                                    <th>UT Report</th>
                                    <th>RT</th>
                                    <th>IRN No</th>
                                    <th>IRN Date</th>
                                    <th>Stage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{row.weld_id}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.drawing_no}</td>
                                        <td style={{ textAlign: 'center' }}>{row.weld_no}</td>
                                        <td style={{ fontWeight: 600 }}>{row.joint_family}</td>
                                        <td style={{ fontWeight: 600 }}>{row.joint_type}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.ndt_requirements}</td>
                                        <td><span style={{ padding: '1px 4px', background: '#f1f5f9', borderRadius: '3px' }}>{row.goc_code}</span></td>
                                        <td style={{ color: '#6366f1' }}>{row.wps_no}</td>
                                        <td style={{ textAlign: 'right' }}>{row.weld_length?.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right' }}>{row.thickness}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{row.welders}</td>
                                        <td>{row.fitup_inspector}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.fitup_date}</td>
                                        <td>{row.fitup_request_no}</td>
                                        <td>{row.visual_inspector}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.visual_date}</td>
                                        <td>{row.visual_request_no}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.backgouge_date}</td>
                                        <td>{row.backgouge_request_no}</td>
                                        <td>
                                            <span style={{ padding: '1px 5px', borderRadius: '4px', fontWeight: 700, background: row.mt_result === 'ACC' ? '#dcfce7' : row.mt_result === 'REJ' ? '#fee2e2' : '#f1f5f9', color: row.mt_result === 'ACC' ? '#166534' : row.mt_result === 'REJ' ? '#991b1b' : '#64748b' }}>
                                                {row.mt_result || '\u2014'}
                                            </span>
                                        </td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.mt_report_no}</td>
                                        <td>
                                            <span style={{ padding: '1px 5px', borderRadius: '4px', fontWeight: 700, background: row.ut_result === 'ACC' ? '#dcfce7' : row.ut_result === 'REJ' ? '#fee2e2' : '#f1f5f9', color: row.ut_result === 'ACC' ? '#166534' : row.ut_result === 'REJ' ? '#991b1b' : '#64748b' }}>
                                                {row.ut_result || '\u2014'}
                                            </span>
                                        </td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.ut_report_no}</td>
                                        <td>
                                            <span style={{ padding: '1px 5px', borderRadius: '4px', fontWeight: 700, background: row.rt_result === 'ACC' ? '#dcfce7' : row.rt_result === 'REJ' ? '#fee2e2' : '#f1f5f9', color: row.rt_result === 'ACC' ? '#166534' : row.rt_result === 'REJ' ? '#991b1b' : '#64748b' }}>
                                                {row.rt_result || '\u2014'}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600, color: '#0369a1', whiteSpace: 'nowrap' }}>{row.irn_no}</td>
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{row.irn_date}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{row.stage}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '8px' }}>* Hi\u1ec3n th\u1ecb 10 d\u00f2ng \u0111\u1ea7u. To\u00e0n b\u1ed9 d\u1eef li\u1ec7u s\u1ebd \u0111\u01b0\u1ee3c import khi b\u1ea5m n\u00fat b\u00ean d\u01b0\u1edbi.</p>
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
