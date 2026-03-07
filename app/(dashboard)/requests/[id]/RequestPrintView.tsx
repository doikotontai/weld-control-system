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
        ws.pageSetup.orientation = 'portrait'
        ws.pageSetup.paperSize = 9 // A4
        ws.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 }

        // General Font
        const stdFont = { name: 'Times New Roman', size: 10 }
        const boldFont = { name: 'Times New Roman', size: 10, bold: true }

        // Helper to set border
        const setAllBorders = (cell: ExcelJS.Cell) => {
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            }
        }

        // ROW 1-3: HEADERS
        ws.mergeCells('B1:D3')
        const vspCell = ws.getCell('B1')
        vspCell.value = 'VSP\nVIETSOVPETRO'
        vspCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FFFF0000' } }
        vspCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

        ws.mergeCells('E1:G3')
        const titleCell = ws.getCell('E1')
        titleCell.value = 'REQUEST FOR INSPECTION\nYÊU CẦU KIỂM TRA'
        titleCell.font = { name: 'Times New Roman', size: 14, bold: true }
        titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

        ws.mergeCells('H1:K3')
        const zarubCell = ws.getCell('H1')
        zarubCell.value = 'ZARUBEZHNEFT\nEP VIETNAM'
        zarubCell.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FF006400' } }
        zarubCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

        for (let r = 1; r <= 3; r++) {
            for (let c = 2; c <= 11; c++) {
                setAllBorders(ws.getCell(r, c))
            }
        }

        // ROW 4: Project & Request No
        ws.mergeCells('B4:G4')
        ws.getCell('B4').value = { richText: [{ font: stdFont, text: 'PROJECT/Công trình: ' }, { font: boldFont, text: (request.projects?.name || '').toUpperCase() }] }
        ws.mergeCells('H4:I4')
        ws.getCell('H4').value = 'Request No:\nYêu cầu số:'
        ws.getCell('H4').alignment = { wrapText: true, vertical: 'middle' }
        ws.mergeCells('J4:K4')
        ws.getCell('J4').value = request.request_no
        ws.getCell('J4').font = { name: 'Times New Roman', size: 12, bold: true }
        ws.getCell('J4').alignment = { horizontal: 'center', vertical: 'middle' }

        // ROW 5: Item & Task No
        ws.mergeCells('B5:G5')
        ws.getCell('B5').value = { richText: [{ font: stdFont, text: 'ITEM/Hạng mục: ' }, { font: boldFont, text: request.item || '' }, { font: stdFont, text: '       Task No./NVXS: ' }, { font: boldFont, text: request.task_no || '' }] }
        ws.mergeCells('H5:K5')

        // ROW 6: Requested By & Date Request
        ws.mergeCells('B6:G6')
        ws.getCell('B6').value = `REQUESTED BY/Đơn vị yêu cầu:\n${request.requested_by.toUpperCase()}`
        ws.getCell('B6').alignment = { wrapText: true }
        ws.getCell('H6').value = 'Date Request:\nNgày yêu cầu:'
        ws.getCell('H6').alignment = { wrapText: true, vertical: 'middle' }
        ws.getCell('I6').value = request.request_time || ''
        ws.getCell('I6').font = boldFont
        ws.getCell('I6').alignment = { horizontal: 'center', vertical: 'middle' }
        ws.mergeCells('J6:K6')
        ws.getCell('J6').value = request.request_date ? format(new Date(request.request_date), 'dd/MM/yyyy') : ''
        ws.getCell('J6').font = boldFont
        ws.getCell('J6').alignment = { horizontal: 'center', vertical: 'middle' }

        // ROW 7: To & Date Inspection
        ws.mergeCells('B7:G7')
        ws.getCell('B7').value = `TO/Gửi đến:\n${request.inspector_company.toUpperCase()}`
        ws.getCell('B7').alignment = { wrapText: true }
        ws.getCell('H7').value = 'Date Inspection:\nKiểm tra lúc:'
        ws.getCell('H7').alignment = { wrapText: true, vertical: 'middle' }
        ws.getCell('I7').value = '10h30'
        ws.getCell('I7').font = { ...boldFont, color: { argb: 'FFFF0000' } }
        ws.getCell('I7').alignment = { horizontal: 'center', vertical: 'middle' }
        ws.mergeCells('J7:K7')
        ws.getCell('J7').value = '#N/A'
        ws.getCell('J7').font = { ...boldFont, color: { argb: 'FFFF0000' } }
        ws.getCell('J7').alignment = { horizontal: 'center', vertical: 'middle' }

        // Apply borders to Info tables (Row 4-7)
        for (let r = 4; r <= 7; r++) {
            for (let c = 2; c <= 11; c++) {
                if (r === 5 && c >= 8) {
                    ws.getCell(r, c).border = { bottom: { style: 'thin' }, top: { style: 'thin' } }
                } else if (r === 4 && c >= 10) {
                    ws.getCell(r, c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
                } else {
                    setAllBorders(ws.getCell(r, c))
                }
            }
        }

        // ROW 8: INSPECTION REQUIRED
        ws.mergeCells('B8:K8')
        ws.getCell('B8').value = 'INSPECTION REQUIRED/Dạng kiểm tra yêu cầu:'
        ws.getCell('B8').font = stdFont

        // ROW 9: Checkboxes labels
        ws.mergeCells('B9:C9')
        ws.getCell('B9').value = 'Fit Up\nMối ghép'
        ws.getCell('D9').value = 'Final Visual\nNgoại dạng'
        ws.getCell('E9').value = 'MT\nBột từ'
        ws.getCell('F9').value = 'PT\nThẩm thấu'
        ws.getCell('G9').value = 'UT\nSiêu âm'
        ws.mergeCells('H9:I9')
        ws.getCell('H9').value = 'RT\nChụp ảnh\nphóng xạ'
        ws.mergeCells('J9:K9')
        ws.getCell('J9').value = 'Other\nKhác'

        for (let c = 2; c <= 11; c++) {
            ws.getCell(9, c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
            ws.getCell(9, c).font = { size: 9, name: 'Times New Roman' }
        }

        // ROW 10: Checkboxes values
        let rt = '☐', ut = '☐', mt = '☐', pt = '☐', vt = '☐', fit = '☐', oth = '☐'
        if (request.request_type === 'fitup') fit = '☑'
        else if (request.request_type === 'visual' || request.request_type === 'final_visual') vt = '☑'
        else if (request.request_type === 'mpi') { mt = '☑'; ut = '☑' }
        else { oth = '☑' }

        ws.mergeCells('B10:C10'); ws.getCell('B10').value = fit
        ws.getCell('D10').value = vt
        ws.getCell('E10').value = mt
        ws.getCell('F10').value = pt
        ws.getCell('G10').value = ut
        ws.mergeCells('H10:I10'); ws.getCell('H10').value = rt
        ws.mergeCells('J10:K10'); ws.getCell('J10').value = oth

        for (let c = 2; c <= 11; c++) {
            ws.getCell(10, c).alignment = { horizontal: 'center', vertical: 'middle' }
            ws.getCell(10, c).font = { size: 14, color: { argb: 'FFFF0000' } }
        }

        ws.mergeCells('B11:K11')
        ws.getCell('B11').value = 'Tick (☑) as applicable/Đánh dấu vào ô cần thiết'
        ws.getCell('B11').font = { size: 8, name: 'Times New Roman' }

        for (let r = 8; r <= 11; r++) {
            for (let c = 2; c <= 11; c++) {
                ws.getCell(r, c).border = { left: { style: 'thin' }, right: { style: 'thin' } }
            }
        }
        for (let c = 2; c <= 11; c++) { ws.getCell(8, c).border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } }

        // ROW 12: REQUIREMENTS title
        ws.mergeCells('B12:K12')
        ws.getCell('B12').value = 'REQUIREMENTS/ Nội dung yêu cầu kiểm tra:'
        ws.getCell('B12').font = stdFont
        for (let c = 2; c <= 11; c++) setAllBorders(ws.getCell(12, c))

        // HEADER ROW 13
        const headerRow = ws.getRow(13)
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

        headerRow.height = 30
        headerRow.eachCell((cell, colNumber) => {
            if (colNumber > 1) {
                cell.font = boldFont
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
                setAllBorders(cell)
            }
        })

        // FILL WELDS DATA (Row 14 onwards)
        let currentRow = 14
        const totalRows = Math.max(15, welds.length)

        for (let i = 0; i < totalRows; i++) {
            const w = welds[i]
            const row = ws.getRow(currentRow)

            if (w) {
                const welders = w.welders ? w.welders.split(';').join(', ') : ''
                let reqNotes = request.request_type === 'mpi' ? (w.ndt_requirements || '100% MT & UT') : request.request_type.toUpperCase()
                if (request.request_type === 'fitup') reqNotes = 'FIT-UP'
                else if (request.request_type === 'backgouge') reqNotes = 'BACKGOUGE'

                row.values = [
                    '',
                    i + 1,
                    w.drawing_no || '',
                    w.weld_no || '',
                    w.joint_type || '',
                    welders,
                    w.wps_number || 'WPS-TNHA-S06',
                    w.weld_length ? `${w.weld_length}` : '',
                    reqNotes,
                    w.goc_code || '',
                    ''
                ]
            } else {
                row.values = ['', '', '', '', '', '', '', '', '', '', '']
            }

            row.eachCell((cell, colNumber) => {
                if (colNumber > 1) {
                    cell.font = stdFont
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
                    setAllBorders(cell)
                    if (colNumber === 4) cell.font = boldFont // Weld No bold
                }
            })
            currentRow++
        }

        // Signatures at the bottom
        ws.mergeCells(`B${currentRow}:K${currentRow}`)
        ws.getCell(`B${currentRow}`).value = 'REMARKS/Ghi chú: F= Fillet, SB= Single Bevel, DB= Double Bevel, SV= Single V, DV= Double V, BW= Butt Weld, SW= Socket Weld.'
        for (let c = 2; c <= 11; c++) { ws.getCell(currentRow, c).border = { left: { style: 'thin' }, right: { style: 'thin' } } }
        ws.getCell(`B${currentRow}`).font = { size: 8, name: 'Times New Roman' }
        currentRow++

        ws.mergeCells(`B${currentRow}:K${currentRow}`)
        ws.getCell(`B${currentRow}`).value = '(1): O x T - diameter x thickness/đường kính x chiều dày ; L x T - length x thickness/chiều dài x chiều dày'
        for (let c = 2; c <= 11; c++) { ws.getCell(currentRow, c).border = { left: { style: 'thin' }, right: { style: 'thin' } } }
        ws.getCell(`B${currentRow}`).font = { size: 8, name: 'Times New Roman' }
        currentRow++

        ws.mergeCells(`B${currentRow}:K${currentRow}`)
        ws.getCell(`B${currentRow}`).value = '(2): GOC System code - Sub-System code'
        for (let c = 2; c <= 11; c++) { ws.getCell(currentRow, c).border = { left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' } } }
        ws.getCell(`B${currentRow}`).font = { size: 8, name: 'Times New Roman' }
        currentRow++

        // Block Sign
        ws.mergeCells(`B${currentRow}:D${currentRow}`)
        ws.getCell(`B${currentRow}`).value = `Requested By/ Người yêu cầu:\nName/H Tên:\n\n\n\n${request.requested_by.toUpperCase()}\nSig./Chữ ký:\n\nTel: #N/A\n\n#N/A`
        ws.getCell(`B${currentRow}`).alignment = { wrapText: true, vertical: 'top', horizontal: 'left' }

        ws.mergeCells(`E${currentRow}:G${currentRow}`)
        ws.getCell(`E${currentRow}`).value = `QC Inspector/ Kiểm tra:\nName/H Tên:\n\n\n\n${request.requested_by.toUpperCase()}\nSig./Chữ ký:\n\nTel: #N/A\n\n#N/A`
        ws.getCell(`E${currentRow}`).alignment = { wrapText: true, vertical: 'top', horizontal: 'left' }

        ws.mergeCells(`H${currentRow}:K${currentRow}`)
        ws.getCell(`H${currentRow}`).value = `NDT Technician\nKỹ thuật viên NDT:\nName/H Tên:\n\n\n\n\nSig./Chữ ký:\n\n\n\n#N/A`
        ws.getCell(`H${currentRow}`).alignment = { wrapText: true, vertical: 'top', horizontal: 'left' }

        ws.getRow(currentRow).height = 150
        for (let c = 2; c <= 11; c++) { setAllBorders(ws.getCell(currentRow, c)) }

        // Export Buffer
        const buffer = await wb.xlsx.writeBuffer()
        saveAs(new Blob([buffer]), `${request.request_no}_INSPECTION.xlsx`)
    }

    return (
        <div className="print-wrapper" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
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
                <table style={{ width: '100%', marginBottom: '10px', borderCollapse: 'collapse', border: '1px solid black' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '25%', border: '1px solid black', textAlign: 'center', verticalAlign: 'middle', padding: '10px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '18pt', color: '#ff0000' }}>VSP</div>
                                <div style={{ fontSize: '9pt', fontWeight: 'bold' }}>VIETSOVPETRO</div>
                            </td>
                            <td style={{ width: '50%', border: '1px solid black', textAlign: 'center', verticalAlign: 'middle' }}>
                                <h2 style={{ margin: 0, fontSize: '14pt', fontWeight: 'bold' }}>REQUEST FOR INSPECTION</h2>
                                <h3 style={{ margin: '8px 0 0 0', fontSize: '12pt', fontWeight: 'bold' }}>YÊU CẦU KIỂM TRA</h3>
                            </td>
                            <td style={{ width: '25%', border: '1px solid black', textAlign: 'center', verticalAlign: 'middle', padding: '10px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14pt', color: '#006400' }}>ZARUBEZHNEFT</div>
                                <div style={{ fontSize: '9pt', color: '#006400', fontWeight: 'bold' }}>EP VIETNAM</div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* INFO TABLE 1 */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid black', borderBottom: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '70%', padding: '4px 8px', borderRight: '1px solid black' }}>
                                PROJECT/Công trình: <strong>{request.projects?.name?.toUpperCase()}</strong>
                            </td>
                            <td colSpan={2} style={{ padding: '4px 8px', verticalAlign: 'middle' }}>
                                Request No: <br />
                                Yêu cầu số:
                            </td>
                            <td style={{ padding: '4px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <strong style={{ fontSize: '12pt' }}>{request.request_no}</strong>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ width: '70%', padding: '4px 8px', borderRight: '1px solid black', borderTop: '1px solid black' }}>
                                ITEM/Hạng mục: <strong>{request.item}</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Task No./NVXS: <strong>{request.task_no}</strong>
                            </td>
                            <td colSpan={3} style={{ borderTop: '1px solid black' }}></td>
                        </tr>
                        <tr>
                            <td style={{ width: '70%', padding: '4px 8px', borderRight: '1px solid black', borderTop: '1px solid black' }}>
                                REQUESTED BY/Đơn vị yêu cầu:<br />
                                <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '4px' }}>{request.requested_by.toUpperCase()}</div>
                            </td>
                            <td style={{ padding: '4px 8px', borderRight: '1px solid black', borderTop: '1px solid black', width: '10%' }}>
                                Date Request:<br />
                                Ngày yêu cầu:
                            </td>
                            <td style={{ padding: '4px 8px', borderTop: '1px solid black', fontWeight: 'bold', textAlign: 'center', width: '10%' }}>
                                {request.request_time}
                            </td>
                            <td style={{ padding: '4px 8px', borderTop: '1px solid black', fontWeight: 'bold', textAlign: 'center', width: '10%' }}>
                                {request.request_date ? format(new Date(request.request_date), 'dd/MM/yyyy') : ''}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ width: '70%', padding: '4px 8px', borderRight: '1px solid black', borderTop: '1px solid black' }}>
                                TO/Gửi đến:<br />
                                <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '4px' }}>{request.inspector_company.toUpperCase()}</div>
                            </td>
                            <td style={{ padding: '4px 8px', borderRight: '1px solid black', borderTop: '1px solid black' }}>
                                Date Inspection:<br />
                                Kiểm tra lúc:
                            </td>
                            <td style={{ padding: '4px 8px', borderTop: '1px solid black', fontWeight: 'bold', textAlign: 'center', color: 'red' }}>
                                10h30
                            </td>
                            <td style={{ padding: '4px 8px', borderTop: '1px solid black', fontWeight: 'bold', textAlign: 'center', color: 'red' }}>
                                #N/A
                            </td>
                        </tr>
                    </tbody>
                </table>



                {/* INFO TABLE 2: INSPECTION TYPE */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', border: '1px solid black', borderTop: 'none' }}>
                    <tbody>
                        <tr>
                            <td colSpan={6} style={{ padding: '2px 8px', borderTop: '1px solid black' }}>
                                INSPECTION REQUIRED/Dạng kiểm tra yêu cầu:
                            </td>
                        </tr>
                        <tr style={{ textAlign: 'center' }}>
                            <td style={{ padding: '4px', width: '16%' }}>Fit Up<br />Mối ghép</td>
                            <td style={{ padding: '4px', width: '16%' }}>Final Visual<br />Ngoại dạng</td>
                            <td style={{ padding: '4px', width: '16%' }}>MT<br />Bột từ</td>
                            <td style={{ padding: '4px', width: '16%' }}>PT<br />Thẩm thấu</td>
                            <td style={{ padding: '4px', width: '16%' }}>UT<br />Siêu âm</td>
                            <td style={{ padding: '4px', width: '10%' }}>RT<br />Chụp ảnh<br />phóng xạ</td>
                            <td style={{ padding: '4px', width: '10%' }}>Other<br />Khác</td>
                        </tr>
                        <tr style={{ textAlign: 'center' }}>
                            <td style={{ paddingBottom: '8px' }}><div style={{ border: '1px solid black', width: '16px', height: '16px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', fontWeight: 'bold' }}>{request.request_type === 'fitup' ? '☑' : ''}</div></td>
                            <td style={{ paddingBottom: '8px' }}><div style={{ border: '1px solid black', width: '16px', height: '16px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', fontWeight: 'bold' }}>{(request.request_type === 'visual' || request.request_type === 'final_visual') ? '☑' : ''}</div></td>
                            <td style={{ paddingBottom: '8px' }}><div style={{ border: '1px solid black', width: '16px', height: '16px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', fontWeight: 'bold' }}>{request.request_type === 'mpi' ? '☑' : ''}</div></td>
                            <td style={{ paddingBottom: '8px' }}><div style={{ border: '1px solid black', width: '16px', height: '16px', margin: '0 auto' }}></div></td>
                            <td style={{ paddingBottom: '8px' }}><div style={{ border: '1px solid black', width: '16px', height: '16px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', fontWeight: 'bold' }}>{request.request_type === 'mpi' ? '☑' : ''}</div></td>
                            <td style={{ paddingBottom: '8px' }}><div style={{ border: '1px solid black', width: '16px', height: '16px', margin: '0 auto' }}></div></td>
                            <td style={{ paddingBottom: '8px' }}><div style={{ border: '1px solid black', width: '16px', height: '16px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', fontWeight: 'bold' }}>{(request.request_type !== 'fitup' && request.request_type !== 'visual' && request.request_type !== 'final_visual' && request.request_type !== 'mpi') ? '☑' : ''}</div></td>
                        </tr>
                        <tr>
                            <td colSpan={7} style={{ padding: '1px 8px', fontSize: '8pt' }}>
                                Tick (☑) as applicable/Đánh dấu vào ô cần thiết
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* WELDS DATA TABLE */}
                <table className="weld-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '9pt', borderBottom: '1px solid black' }}>
                    <thead>
                        <tr>
                            <td colSpan={10} style={{ textAlign: 'left', padding: '2px 8px', borderLeft: '1px solid black', borderRight: '1px solid black' }}>REQUIREMENTS/ Nội dung yêu cầu kiểm tra:</td>
                        </tr>
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
                                    <td style={{ border: '1px solid black', padding: '4px' }}>{i + 1}</td>
                                    <td style={{ border: '1px solid black', padding: '4px' }}>{w.drawing_no}</td>
                                    <td style={{ border: '1px solid black', padding: '4px', fontWeight: 'bold' }}>{String(w.weld_no)}</td>
                                    <td style={{ border: '1px solid black', padding: '4px' }}>{w.joint_type}</td>
                                    <td style={{ border: '1px solid black', padding: '4px' }}>{welders}</td>
                                    <td style={{ border: '1px solid black', padding: '4px' }}>{w.wps_number || 'WPS-TNHA-S06'}</td>
                                    <td style={{ border: '1px solid black', padding: '4px' }}>{w.weld_length ? `${w.weld_length}` : ''}</td>
                                    <td style={{ border: '1px solid black', padding: '4px' }}>{reqNotes}</td>
                                    <td style={{ border: '1px solid black', padding: '4px' }}>{w.goc_code}</td>
                                    <td style={{ border: '1px solid black', padding: '4px' }}></td>
                                </tr>
                            )
                        })}
                        {/* Pad empty rows up to 15 to make it look like the Excel sheet format */}
                        {Array.from({ length: Math.max(0, 15 - welds.length) }).map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* REMARKS FOOTER */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', border: '1px solid black', borderTop: 'none' }}>
                    <tbody>
                        <tr>
                            <td colSpan={3} style={{ padding: '2px 4px' }}>
                                REMARKS/Ghi chú: F= Fillet, SB= Single Bevel, DB= Double Bevel, SV= Single V, DV= Double V, BW= Butt Weld, SW= Socket Weld.
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={3} style={{ padding: '2px 4px' }}>
                                (1): O x T - diameter x thickness/đường kính x chiều dày ; L x T - length x thickness/chiều dài x chiều dày
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={3} style={{ padding: '2px 4px', borderBottom: '1px solid black' }}>
                                (2): GOC System code - Sub-System code
                            </td>
                        </tr>
                        <tr style={{ verticalAlign: 'top' }}>
                            <td style={{ padding: '4px', width: '33%', borderRight: '1px solid black' }}>
                                Requested By/ Người yêu cầu: <br />
                                Name/H Tên:<br />
                                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', marginBottom: '16px', marginTop: '4px' }}>
                                    {request.requested_by.toUpperCase()}
                                </div>
                                Sig./Chữ ký:<br /><br />
                                Tel: #N/A<br /><br />
                                <div style={{ textAlign: 'center' }}>#N/A</div>
                            </td>
                            <td style={{ padding: '4px', width: '33%', borderRight: '1px solid black' }}>
                                QC Inspector/ Kiểm tra: <br />
                                Name/H Tên:<br />
                                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', marginBottom: '16px', marginTop: '4px' }}>
                                    {request.requested_by.toUpperCase()}
                                </div>
                                Sig./Chữ ký:<br /><br />
                                Tel: #N/A<br /><br />
                                <div style={{ textAlign: 'center' }}>#N/A</div>
                            </td>
                            <td style={{ padding: '4px', width: '33%' }}>
                                NDT Technician<br />
                                Kỹ thuật viên NDT: <br />
                                Name/H Tên:<br />
                                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', marginBottom: '16px', marginTop: '4px' }}>
                                </div>
                                Sig./Chữ ký:<br /><br /><br /><br />
                                <div style={{ textAlign: 'center' }}>#N/A</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '9pt' }}>Page 1 of 1</div>
            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 5mm; 
                    }
                    body, html { 
                        background: white !important; 
                        margin: 0 !important; 
                        padding: 0 !important;
                        min-width: 100%;
                    }
                    /* Hiding sidebar specifically and gracefully reset main layout */
                    .dashboard-sidebar { 
                        display: none !important; 
                    }
                    .dashboard-layout-main {
                        margin-left: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        min-height: auto !important;
                    }
                    
                    /* Hiding top action bar */
                    .no-print { 
                        display: none !important; 
                    }
                    /* Remove padding limits from wrapper and its parents if possible */
                    .print-wrapper {
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: none !important;
                        width: 100% !important;
                    }
                    .print-container { 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        width: 100% !important;
                        max-width: none !important;
                    }
                    /* Prevent page breaks inside rows */
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                }
            `}} />
        </div>
    )
}
