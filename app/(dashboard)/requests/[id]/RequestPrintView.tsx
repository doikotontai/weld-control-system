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
        try {
            // Log path to debug on Vercel
            const templatePath = '/formxuatexcel.xlsx';
            console.log("Fetching Excel template from:", templatePath);

            const response = await fetch(templatePath, { cache: 'no-store' }); // Prevent stale cache
            if (!response.ok) {
                console.error("Fetch failed with status:", response.status, response.statusText);
                throw new Error(`Could not find /formxuatexcel.xlsx (Status: ${response.status})`);
            }
            const arrayBuffer = await response.arrayBuffer()

            const wb = new ExcelJS.Workbook()
            await wb.xlsx.load(arrayBuffer)
            const ws = wb.getWorksheet(1)

            if (!ws) throw new Error("Template worksheet not found")

            // Re-map request and weld data exactly into the template's placeholders
            ws.getCell('A3').value = `PROJECT/Công trình: ${(request.projects?.name || '').toUpperCase()}`
            ws.getCell('A4').value = `ITEM/Hạng mục:  ${request.item || ''}                Task No./NVXS: ${request.task_no || ''}`
            ws.getCell('B8').value = `HANA NDT / ${(request.inspector_company || '').toUpperCase()} / CA`

            ws.getCell('H3').value = request.request_no || ''
            ws.getCell('H5').value = request.request_date ? format(new Date(request.request_date), 'dd/MM/yyyy') : ''
            ws.getCell('G5').value = request.request_time || ''
            ws.getCell('H7').value = '#N/A'
            ws.getCell('G7').value = '10h30'

            // Fill Weld Data (Starts from Row 17, max approx 50 ending at 66)
            // The template has exactly rows 17 to 69 for data (53 rows total). 
            // We must clear ALL of them so no orphaned shared formula clones remain (e.g. G67).
            const startRow = 17
            const MAX_ROWS = 53
            for (let i = 0; i < MAX_ROWS; i++) {
                const w = welds[i]
                const rowIndex = startRow + i
                const row = ws.getRow(rowIndex)

                if (w) {
                    const welders = w.welders ? w.welders.split(';').join(', ') : ''
                    let reqNotes = request.request_type === 'mpi' ? (w.ndt_requirements || '100% MT & UT') : (request.request_type || '').toUpperCase()
                    if (request.request_type === 'fitup') reqNotes = 'FIT-UP'
                    else if (request.request_type === 'backgouge') reqNotes = 'BACKGOUGE'

                    row.getCell(1).value = i + 1          // STT
                    row.getCell(2).value = w.drawing_no || ''     // Drawing
                    row.getCell(3).value = w.weld_no || ''        // Weld No
                    row.getCell(4).value = w.joint_type || ''     // Weld Type
                    row.getCell(5).value = welders        // Welder No
                    row.getCell(6).value = w.wps_number || 'WPS-TNHA-S06' // WPS
                    row.getCell(7).value = w.weld_length ? `${w.weld_length}` : '' // Weld Size
                    row.getCell(8).value = reqNotes // Inspection Req
                    row.getCell(9).value = w.goc_code || '' // GOC Code

                    if (row.getCell(10).value === '#REF!') {
                        row.getCell(10).value = ''
                    }
                } else {
                    for (let c = 1; c <= 10; c++) {
                        row.getCell(c).value = ''
                    }
                }
            }

            const buffer = await wb.xlsx.writeBuffer()
            saveAs(new Blob([buffer]), `${request.request_no}_INSPECTION.xlsx`)
        } catch (err: any) {
            console.error('Error exporting template:', err)
            // Catch exact trace for user debugging
            alert(`Lỗi xuất Excel: ${err?.message || err}. \nVui lòng chụp màn hình lỗi này gửi dev.`)
        }
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
                                PROJECT/Công trình: <strong>{(request.projects?.name || '').toUpperCase()}</strong>
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
                                <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '4px' }}>{(request.requested_by || '').toUpperCase()}</div>
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
                                <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '4px' }}>{(request.inspector_company || '').toUpperCase()}</div>
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
                <table className="weld-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '7.5pt', borderBottom: '1px solid black' }}>
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
                        {Array.from({ length: Math.max(15, welds.length) }).map((_, i) => {
                            const w = welds[i]
                            if (!w) return (
                                <tr key={`empty-${i}`}>
                                    <td style={{ textAlign: 'center', border: '1px solid black', padding: '3px' }}>{i + 1}</td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}></td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}></td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}></td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}></td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}></td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}></td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}></td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}></td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}></td>
                                </tr>
                            )

                            const welders = w.welders ? w.welders.split(';').join(', ') : ''
                            let reqNotes = request.request_type === 'mpi' ? (w.ndt_requirements || '100% MT & UT') : (request.request_type || '').toUpperCase()
                            if (request.request_type === 'fitup') reqNotes = 'FIT-UP'
                            else if (request.request_type === 'backgouge') reqNotes = 'BACKGOUGE'

                            return (
                                <tr key={w.id}>
                                    <td style={{ border: '1px solid black', padding: '3px' }}>{i + 1}</td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}>{w.drawing_no}</td>
                                    <td style={{ border: '1px solid black', padding: '3px', fontWeight: 'bold' }}>{String(w.weld_no)}</td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}>{w.joint_type}</td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}>{welders}</td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}>{w.wps_number || 'WPS-TNHA-S06'}</td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}>{w.weld_length ? `${w.weld_length}` : ''}</td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}>{reqNotes}</td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}>{w.goc_code}</td>
                                    <td style={{ border: '1px solid black', padding: '3px' }}></td>
                                </tr>
                            )
                        })}
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
                                    {(request.requested_by || '').toUpperCase()}
                                </div>
                                Sig./Chữ ký:<br /><br /><br /><br />
                                Tel: #N/A<br /><br />
                            </td>
                            <td style={{ padding: '4px', width: '33%', borderRight: '1px solid black' }}>
                                QC Inspector/ Kiểm tra: <br />
                                Name/H Tên:<br />
                                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', marginBottom: '16px', marginTop: '4px' }}>
                                    {(request.requested_by || '').toUpperCase()}
                                </div>
                                Sig./Chữ ký:<br /><br /><br /><br />
                                Tel: #N/A<br /><br />
                            </td>
                            <td style={{ padding: '4px', width: '33%' }}>
                                NDT Technician<br />
                                Kỹ thuật viên NDT: <br />
                                Name/H Tên:<br />
                                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', marginBottom: '16px', marginTop: '4px' }}>
                                    <br />
                                </div>
                                Sig./Chữ ký:<br /><br /><br /><br />
                                <div style={{ textAlign: 'center', color: 'transparent' }}>#N/A</div>
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
                        margin: 8mm; 
                    }
                    body, html { 
                        background: white !important; 
                        margin: 0 !important; 
                        padding: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                    }
                    /* Hiding sidebar, nav, overlay and gracefully reset main layout */
                    .dashboard-sidebar, .sidebar, nav, header, footer { 
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
                    .print-wrapper {
                        padding: 0 !important;
                        margin: 0 auto !important;
                        width: 195mm !important; /* 210mm A4 width minus 15mm total margin */
                        max-width: 195mm !important;
                    }
                    .print-container { 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        width: 100% !important;
                        max-width: 100% !important;
                        border: none !important;
                    }
                    /* Prevent page breaks inside rows */
                    table { page-break-inside: auto; width: 100% !important; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    td { padding-bottom: 2px !important; padding-top: 2px !important; }
                }
            `}} />
        </div>
    )
}
