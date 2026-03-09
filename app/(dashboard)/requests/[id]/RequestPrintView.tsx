'use client'

import ExcelJS from 'exceljs'
import Link from 'next/link'
import { formatDate } from '@/lib/formatters'
import { saveAs } from 'file-saver'

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
    wps_no?: string
    weld_length?: number
    ndt_requirements?: string
    goc_code?: string
}

function resolveInspectionRequired(requestType: string, weld: Weld) {
    if (requestType === 'fitup') return 'FIT-UP'
    if (requestType === 'backgouge') return 'BACKGOUGE'
    if (requestType === 'request') return weld.ndt_requirements || 'MT / UT'
    return requestType.toUpperCase()
}

export default function RequestPrintView({ request, welds }: { request: Request; welds: Weld[] }) {
    const handlePrint = () => {
        window.print()
    }

    const handleExportExcel = async () => {
        try {
            const response = await fetch('/formxuatexcel.xlsx', { cache: 'no-store' })
            if (!response.ok) {
                throw new Error(`Could not load Excel template (status ${response.status})`)
            }

            const workbookBuffer = await response.arrayBuffer()
            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(workbookBuffer)

            const worksheet = workbook.getWorksheet(1)
            if (!worksheet) {
                throw new Error('Template worksheet not found')
            }

            worksheet.getCell('A3').value = `PROJECT/Cong trinh: ${(request.projects?.name || '').toUpperCase()}`
            worksheet.getCell('A4').value = `ITEM/Hang muc: ${request.item || ''}    Task No.: ${request.task_no || ''}`
            worksheet.getCell('B8').value = `NDT COMPANY / ${(request.inspector_company || '').toUpperCase()}`
            worksheet.getCell('H3').value = request.request_no || ''
            worksheet.getCell('H5').value = request.request_date ? formatDate(request.request_date) : ''
            worksheet.getCell('G5').value = request.request_time || ''

            const startRow = 17
            const maxRows = 53

            for (let index = 0; index < maxRows; index += 1) {
                const weld = welds[index]
                const row = worksheet.getRow(startRow + index)

                if (!weld) {
                    for (let cellIndex = 1; cellIndex <= 10; cellIndex += 1) {
                        row.getCell(cellIndex).value = ''
                    }
                    continue
                }

                row.getCell(1).value = index + 1
                row.getCell(2).value = weld.drawing_no || ''
                row.getCell(3).value = weld.weld_no || ''
                row.getCell(4).value = weld.joint_type || ''
                row.getCell(5).value = weld.welders ? weld.welders.split(';').join(', ') : ''
                row.getCell(6).value = weld.wps_no || ''
                row.getCell(7).value = weld.weld_length ? `${weld.weld_length}` : ''
                row.getCell(8).value = resolveInspectionRequired(request.request_type, weld)
                row.getCell(9).value = weld.goc_code || ''
                row.getCell(10).value = ''
            }

            const outputBuffer = await workbook.xlsx.writeBuffer()
            saveAs(new Blob([outputBuffer]), `${request.request_no}_INSPECTION.xlsx`)
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error)
            console.error('Error exporting template:', error)
            alert(`Loi xuat Excel: ${message}`)
        }
    }

    return (
        <div className="print-wrapper" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: 'white', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <Link href="/requests" style={{ color: '#475569', textDecoration: 'none', fontWeight: 600 }}>
                    {'<- Quay lai danh sach'}
                </Link>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handlePrint} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        In / Xuat PDF
                    </button>
                    <button onClick={handleExportExcel} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Xuat Excel
                    </button>
                </div>
            </div>

            <div className="print-container" style={{ background: 'white', padding: '12mm', color: 'black', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginBottom: '20px', borderBottom: '1px solid black', paddingBottom: '12px' }}>
                    <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>REQUEST FOR INSPECTION</div>
                        <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>Project: <strong>{request.projects?.name || '-'}</strong></div>
                        <div style={{ fontSize: '0.9rem' }}>Item: <strong>{request.item || '-'}</strong></div>
                        <div style={{ fontSize: '0.9rem' }}>Task No.: <strong>{request.task_no || '-'}</strong></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div>Request No.: <strong>{request.request_no}</strong></div>
                        <div>Request Date: <strong>{request.request_date ? formatDate(request.request_date) : '-'}</strong></div>
                        <div>Request Time: <strong>{request.request_time || '-'}</strong></div>
                        <div>To: <strong>{request.inspector_company || '-'}</strong></div>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                        <tr>
                            {['No.', 'Drawing', 'Weld No', 'Type', 'Welder', 'WPS', 'Size', 'Inspection Required', 'GOC Code'].map((header) => (
                                <th key={header} style={{ border: '1px solid black', padding: '6px', textAlign: 'center', background: '#f8fafc' }}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: Math.max(15, welds.length) }).map((_, index) => {
                            const weld = welds[index]

                            return (
                                <tr key={weld?.id || `empty-${index}`}>
                                    <td style={{ border: '1px solid black', padding: '6px', textAlign: 'center' }}>{index + 1}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{weld?.drawing_no || ''}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{weld?.weld_no || ''}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{weld?.joint_type || ''}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{weld?.welders ? weld.welders.split(';').join(', ') : ''}</td>
                                     <td style={{ border: '1px solid black', padding: '6px' }}>{weld?.wps_no || ''}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{weld?.weld_length ? `${weld.weld_length}` : ''}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{weld ? resolveInspectionRequired(request.request_type, weld) : ''}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{weld?.goc_code || ''}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '0.8rem' }}>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: '8px' }}>Requested By</div>
                        <div>{request.requested_by || '-'}</div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: '8px' }}>QC Inspector</div>
                        <div>{request.requested_by || '-'}</div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: '8px' }}>NDT Technician</div>
                        <div>________________</div>
                    </div>
                </div>
            </div>

            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        @media print {
                            @page {
                                size: A4 portrait;
                                margin: 8mm;
                            }
                            .no-print {
                                display: none !important;
                            }
                            .print-wrapper {
                                padding: 0 !important;
                                margin: 0 auto !important;
                            }
                            .print-container {
                                box-shadow: none !important;
                                border: none !important;
                            }
                        }
                    `,
                }}
            />
        </div>
    )
}



