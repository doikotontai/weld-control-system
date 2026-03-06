'use client'

import React from 'react'
import { format } from 'date-fns'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import Link from 'next/link'

interface Request {
    id: string
    request_no: string
    request_date: string
    request_type: string
    item: string
    task_no: string
    requested_by: string
    inspector_company: string
    request_time: string
    projects: { code: string; name: string }
}

interface Weld {
    id: string
    weld_id: string
    drawing_no: string
    weld_no: string
    joint_type: string
    welders: string
    wps_number?: string
    weld_length?: number
    ndt_requirements?: string
    goc_code?: string
    fitup_date?: string
    fitup_accepted_date?: string
    visual_date?: string
    backgouge_date?: string
}

export default function RequestPrintView({ request, welds }: { request: Request, welds: Weld[] }) {
    const handlePrint = () => {
        window.print()
    }

    const handleExportExcel = async () => {
        const wb = new ExcelJS.Workbook()
        const ws = wb.addWorksheet('REQUEST')

        // Setup column widths (approximate matching Excel)
        ws.columns = [
            { width: 5 },   // A - Margin
            { width: 5 },   // B - STT
            { width: 35 },  // C - Drawing
            { width: 12 },  // D - Weld No
            { width: 10 },  // E - Weld Type
            { width: 20 },  // F - Welder No
            { width: 18 },  // G - WPS
            { width: 14 },  // H - Weld Size
            { width: 22 },  // I - Inspection Required
            { width: 14 },  // J - GOC
            { width: 15 },  // K - Remarks
        ]

        // Page Setup
        ws.pageSetup.orientation = 'landscape'
        ws.pageSetup.paperSize = 9 // A4
        ws.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 }

        // General Font
        const stdFont = { name: 'Times New Roman', size: 11 }
        const boldFont = { name: 'Times New Roman', size: 11, bold: true }

        // Row 1 & 2 (Title)
        ws.mergeCells('B1:K1')
        ws.getCell('B1').value = 'REQUEST FOR INSPECTION'
        ws.getCell('B1').font = { name: 'Times New Roman', size: 16, bold: true }
        ws.getCell('B1').alignment = { horizontal: 'center' }

        ws.mergeCells('B2:K2')
        ws.getCell('B2').value = 'YÊU CẦU KIỂM TRA'
        ws.getCell('B2').font = { name: 'Times New Roman', size: 14, bold: true }
        ws.getCell('B2').alignment = { horizontal: 'center' }

        // Row 3
        ws.mergeCells('B3:E3')
        ws.getCell('B3').value = `PROJECT/Công trình: ${request.projects?.name || ''}`
        ws.getCell('B3').font = boldFont

        ws.getCell('J3').value = 'Request No:'
        ws.getCell('J3').font = boldFont
        ws.getCell('K3').value = request.request_no
        ws.getCell('K3').font = boldFont

        // Row 4
        ws.mergeCells('B4:E4')
        ws.getCell('B4').value = `ITEM/Hạng mục: ${request.item || ''}`
        ws.getCell('B4').font = boldFont

        ws.getCell('J4').value = 'Task No.:'
        ws.getCell('J4').font = boldFont
        ws.getCell('K4').value = request.task_no || ''
        ws.getCell('K4').font = boldFont

        // Blank Row 5

        // Row 6 (B5 -> Excel actually starts the block here)
        ws.mergeCells('B6:E6')
        ws.getCell('B6').value = `REQUESTED BY/Đơn vị yêu cầu: ${request.requested_by || ''}`
        ws.getCell('B6').font = stdFont

        ws.getCell('H6').value = 'Date Request:'
        ws.getCell('I6').value = request.request_date ? format(new Date(request.request_date), 'dd/MM/yyyy') : ''
        ws.getCell('J6').value = 'Time:'
        ws.getCell('K6').value = request.request_time || ''

        // Row 8
        ws.mergeCells('B8:E8')
        ws.getCell('B8').value = `TO/Gửi đến: ${request.inspector_company || ''}`
        ws.getCell('B8').font = stdFont

        ws.getCell('H8').value = 'Date Inspection:'
        ws.getCell('I8').value = ''
        ws.getCell('J8').value = 'Time:'
        ws.getCell('K8').value = ''

        // Row 10
        ws.mergeCells('B10:E10')
        ws.getCell('B10').value = 'INSPECTION REQUIRED/Dạng kiểm tra yêu cầu:'
        ws.getCell('B10').font = boldFont

        // Row 11 Checkboxes (Mocking)
        let rt = '[ ]', ut = '[ ]', mt = '[ ]', pt = '[ ]', vt = '[ ]', fit = '[ ]'
        if (request.request_type === 'fitup') fit = '[X]'
        else if (request.request_type === 'visual' || request.request_type === 'final_visual') vt = '[X]'
        else if (request.request_type === 'mpi') { mt = '[X]'; ut = '[X]' }

        ws.getCell('B11').value = `${fit} Fit Up / Mối ghép`
        ws.getCell('C11').value = `${vt} Final Visual / Ngoại dạng`
        ws.getCell('D11').value = `${mt} MT / Bột từ`
        ws.getCell('E11').value = `${pt} PT / Thẩm thấu`
        ws.getCell('F11').value = `${ut} UT / Siêu âm`
        ws.getCell('G11').value = `${rt} RT / Chụp ảnh`

        // Bỏ qua đến dòng 14
        ws.mergeCells('B14:K14')
        ws.getCell('B14').value = 'REQUIREMENTS/ Nội dung yêu cầu kiểm tra:'
        ws.getCell('B14').font = stdFont

        // HEADER ROW 15
        const headerRow = ws.getRow(15)
        headerRow.values = [
            '', // A
            'NN\nSTT', // B
            'Drawing\nBản vẽ', // C
            'Weld No.\nSố mối hàn', // D
            'Weld type', // E
            'Welder No.\nSố thợ hàn', // F
            'WPS\nQui trình', // G
            'Weld Size (mm)\nKích thước (mm)', // H
            'Inspection Required\nYêu cầu kiểm tra', // I
            'GOC code', // J
            'Remarks\nFinish Date' // K
        ]

        headerRow.height = 40
        headerRow.eachCell((cell, colNumber) => {
            if (colNumber > 1) {
                cell.font = boldFont
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                }
            }
        })

        // FILL WELDS DATA (Row 16 onwards)
        let currentRow = 16
        welds.forEach((w, index) => {
            const row = ws.getRow(currentRow)

            // Clean up welder string (replace semicolons with commas or line breaks if needed)
            const welders = w.welders ? w.welders.split(';').join(', ') : ''
            let reqNotes = request.request_type === 'mpi' ? (w.ndt_requirements || '100% MT & UT') : request.request_type.toUpperCase()
            if (request.request_type === 'fitup') reqNotes = 'FIT-UP'
            else if (request.request_type === 'backgouge') reqNotes = 'BACKGOUGE'

            row.values = [
                '',
                index + 1,
                w.drawing_no || '',
                w.weld_no || '',
                w.joint_type || '',
                welders,
                w.wps_number || 'WPS-TNHA-S06', // Default or from db
                w.weld_length ? `${w.weld_length}` : '',
                reqNotes,
                w.goc_code || '',
                ''
            ]

            row.eachCell((cell, colNumber) => {
                if (colNumber > 1) {
                    cell.font = stdFont
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
                    cell.border = {
                        top: { style: 'thin' }, left: { style: 'thin' },
                        bottom: { style: 'thin' }, right: { style: 'thin' }
                    }
                }
            })
            currentRow++
        })

        // Signatures at the bottom
        currentRow += 2
        ws.getCell(`B${currentRow}`).value = 'Signatures / Chữ ký:'
        ws.getCell(`B${currentRow}`).font = boldFont

        currentRow += 1
        ws.getCell(`C${currentRow}`).value = 'Contractor/Nhà thầu'
        ws.getCell(`G${currentRow}`).value = 'NDT Subcontractor'
        ws.getCell(`I${currentRow}`).value = 'Client/Chủ đầu tư';

        [ws.getCell(`C${currentRow}`), ws.getCell(`G${currentRow}`), ws.getCell(`I${currentRow}`)].forEach(c => {
            c.font = boldFont
            c.alignment = { horizontal: 'center' }
        })

        // Export Buffer
        const buffer = await wb.xlsx.writeBuffer()
        saveAs(new Blob([buffer]), `${request.request_no}_INSPECTION.xlsx`)
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Action Bar (Not printed) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: 'white', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div>
                    <Link href="/requests" style={{ color: '#475569', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>← Quay lại danh sách</span>
                    </Link>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handlePrint} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🖨️ In / Xuất PDF
                    </button>
                    <button onClick={handleExportExcel} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📊 Xuất file Excel
                    </button>
                </div>
            </div>

            {/* Printable A4 Container */}
            <div className="print-container" style={{ background: 'white', padding: '10mm', minHeight: '210mm', color: 'black', fontFamily: '"Times New Roman", Times, serif', fontSize: '11pt', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderRadius: '4px', overflowX: 'auto' }}>

                {/* HEADERS */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '16pt', fontWeight: 'bold' }}>REQUEST FOR INSPECTION</h2>
                    <h3 style={{ margin: '4px 0 0 0', fontSize: '14pt', fontWeight: 'bold' }}>YÊU CẦU KIỂM TRA</h3>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontWeight: 'bold' }}>
                    <div>PROJECT/Công trình: {request.projects?.name}</div>
                    <div>Request No: {request.request_no}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontWeight: 'bold' }}>
                    <div>ITEM/Hạng mục: {request.item}</div>
                    <div>Task No.: {request.task_no}</div>
                </div>

                {/* INFO TABLE 1 */}
                <table style={{ width: '100%', marginBottom: '24px', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '50%', padding: '4px 0' }}>REQUESTED BY/Đơn vị yêu cầu: <strong>{request.requested_by}</strong></td>
                            <td style={{ width: '25%', padding: '4px 0' }}>Date Request: <strong>{request.request_date ? format(new Date(request.request_date), 'dd/MM/yyyy') : ''}</strong></td>
                            <td style={{ width: '25%', padding: '4px 0' }}>Time: <strong>{request.request_time}</strong></td>
                        </tr>
                        <tr>
                            <td style={{ padding: '4px 0' }}>TO/Gửi đến: <strong>{request.inspector_company}</strong></td>
                            <td style={{ padding: '4px 0' }}>Date Inspection: </td>
                            <td style={{ padding: '4px 0' }}>Time: </td>
                        </tr>
                    </tbody>
                </table>

                {/* INFO TABLE 2: INSPECTION TYPE */}
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>INSPECTION REQUIRED/Dạng kiểm tra yêu cầu:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '24px', paddingLeft: '20px' }}>
                    <div>{request.request_type === 'fitup' ? '☑' : '☐'} Fit Up / Mối ghép</div>
                    <div>{(request.request_type === 'visual' || request.request_type === 'final_visual') ? '☑' : '☐'} Final Visual / Ngoại dạng</div>
                    <div>{request.request_type === 'mpi' ? '☑' : '☐'} MT / Bột từ</div>
                    <div>☐ PT / Thẩm thấu</div>
                    <div>{request.request_type === 'mpi' ? '☑' : '☐'} UT / Siêu âm</div>
                    <div>☐ RT / Chụp ảnh</div>
                    <div>{(request.request_type !== 'fitup' && request.request_type !== 'visual' && request.request_type !== 'final_visual' && request.request_type !== 'mpi') ? '☑' : '☐'} Khác: {request.request_type}</div>
                </div>

                <div style={{ marginBottom: '8px' }}>REQUIREMENTS/ Nội dung yêu cầu kiểm tra:</div>

                {/* WELDS DATA TABLE */}
                <table className="weld-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', marginBottom: '40px' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={{ border: '1px solid black', padding: '6px' }}>NN<br />STT</th>
                            <th style={{ border: '1px solid black', padding: '6px' }}>Drawing<br />Bản vẽ</th>
                            <th style={{ border: '1px solid black', padding: '6px' }}>Weld No.<br />Số mối hàn</th>
                            <th style={{ border: '1px solid black', padding: '6px' }}>Weld type</th>
                            <th style={{ border: '1px solid black', padding: '6px' }}>Welder No.<br />Số thợ hàn</th>
                            <th style={{ border: '1px solid black', padding: '6px' }}>WPS<br />Qui trình</th>
                            <th style={{ border: '1px solid black', padding: '6px' }}>Weld Size (mm)<br />Kích thước</th>
                            <th style={{ border: '1px solid black', padding: '6px' }}>Inspection Required<br />Yêu cầu kiểm tra</th>
                            <th style={{ border: '1px solid black', padding: '6px' }}>GOC code</th>
                            <th style={{ border: '1px solid black', padding: '6px', width: '100px' }}>Remarks<br />Finish Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {welds.map((w, i) => {
                            const welders = w.welders ? w.welders.split(';').join(', ') : ''
                            let reqNotes = request.request_type === 'mpi' ? (w.ndt_requirements || '100% MT & UT') : request.request_type.toUpperCase()
                            if (request.request_type === 'fitup') reqNotes = 'FIT-UP'
                            else if (request.request_type === 'backgouge') reqNotes = 'BACKGOUGE'

                            return (
                                <tr key={w.id}>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{i + 1}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{w.drawing_no}</td>
                                    <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold' }}>{String(w.weld_no)}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{w.joint_type}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{welders}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{w.wps_number || 'WPS-TNHA-S06'}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{w.weld_length ? `${w.weld_length}` : ''}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{reqNotes}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{w.goc_code}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}></td>
                                </tr>
                            )
                        })}
                        {welds.length === 0 && (
                            <tr><td colSpan={10} style={{ border: '1px solid black', padding: '20px', color: 'red' }}>Danh sách trống! Mối hàn đã bị xoá hoặc request_no không khớp.</td></tr>
                        )}
                    </tbody>
                </table>

                {/* SIGNATURES */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', marginTop: '40px', fontWeight: 'bold' }}>
                    <div>
                        <div style={{ marginBottom: '80px' }}>Contractor/Nhà thầu</div>
                        <div>(Sign & Name)</div>
                    </div>
                    <div>
                        <div style={{ marginBottom: '80px' }}>NDT Subcontractor</div>
                        <div>(Sign & Name)</div>
                    </div>
                    <div>
                        <div style={{ marginBottom: '80px' }}>Client/Chủ đầu tư</div>
                        <div>(Sign & Name)</div>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: A4 landscape; margin: 10mm; }
                    body { background: white !important; margin: 0; padding: 0; }
                    .no-print { display: none !important; }
                    .print-container { box-shadow: none !important; margin: 0; padding: 0 !important; }
                    nav, sidebar, #sidebar { display: none !important; }
                    html, body { min-width: 100%; overflow: visible; }
                }
            `}} />
        </div>
    )
}
