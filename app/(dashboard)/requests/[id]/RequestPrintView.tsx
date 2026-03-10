'use client'

import ExcelJS from 'exceljs'
import Link from 'next/link'
import { saveAs } from 'file-saver'
import { formatDate } from '@/lib/formatters'
import { inferRequestMethods, RequestMethodFlags, REQUEST_TYPE_LABELS } from '@/lib/request-config'
import { EditableRequestItem } from '@/lib/request-items'

interface RequestRecord {
    id: string
    request_no: string
    request_date: string | null
    request_type: string
    item: string | null
    task_no: string | null
    requested_by: string | null
    inspector_company: string | null
    request_time: string | null
    inspection_date: string | null
    inspection_time: string | null
    remarks: string | null
    inspection_methods?: RequestMethodFlags | null
    projects?: { code?: string | null; name?: string | null } | null
}

const METHOD_CONFIG: Array<{
    key: Exclude<keyof RequestMethodFlags, 'otherLabel'>
    title: string
    subtitle: string
}> = [
    { key: 'fitUp', title: 'Fit Up', subtitle: 'Mối ghép' },
    { key: 'finalVisual', title: 'Final Visual', subtitle: 'Ngoại dạng' },
    { key: 'mt', title: 'MT', subtitle: 'Bột từ' },
    { key: 'pt', title: 'PT', subtitle: 'Thẩm thấu' },
    { key: 'ut', title: 'UT', subtitle: 'Siêu âm' },
    { key: 'rt', title: 'RT', subtitle: 'Chụp ảnh phóng xạ' },
    { key: 'other', title: 'Other', subtitle: 'Khác' },
]

function TickBox({ checked, label }: { checked: boolean; label?: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div
                style={{
                    width: '34px',
                    height: '34px',
                    border: '1.5px solid #0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    lineHeight: 1,
                    fontWeight: 700,
                }}
            >
                {checked ? '√' : ''}
            </div>
            {label ? <span style={{ fontSize: '0.68rem', color: '#475569', textAlign: 'center' }}>{label}</span> : null}
        </div>
    )
}

function applyMethodTicks(worksheet: ExcelJS.Worksheet, methods: RequestMethodFlags) {
    const tickValue = '√'
    const mapping: Partial<Record<keyof RequestMethodFlags, string>> = {
        fitUp: 'A13',
        finalVisual: 'C13',
        mt: 'F13',
        pt: 'G13',
        ut: 'H13',
        rt: 'I13',
        other: 'K13',
    }

    Object.entries(mapping).forEach(([key, cell]) => {
        worksheet.getCell(cell).value = methods[key as keyof RequestMethodFlags] ? tickValue : ''
    })
}

function resolveMethods(request: RequestRecord, items: EditableRequestItem[]) {
    return request.inspection_methods || inferRequestMethods(
        request.request_type as never,
        items.map((item) => ({ ndt_requirements: item.inspection_required }))
    )
}

export default function RequestPrintView({ request, items }: { request: RequestRecord; items: EditableRequestItem[] }) {
    const methods = resolveMethods(request, items)

    const handlePrint = () => {
        window.print()
    }

    const handleExportExcel = async () => {
        try {
            const response = await fetch('/formxuatexcel.xlsx', { cache: 'no-store' })
            if (!response.ok) {
                throw new Error(`Không tải được mẫu Excel (status ${response.status})`)
            }

            const workbookBuffer = await response.arrayBuffer()
            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(workbookBuffer)

            const worksheet = workbook.getWorksheet(1)
            if (!worksheet) {
                throw new Error('Không tìm thấy sheet mẫu')
            }

            worksheet.getCell('A3').value = `PROJECT/Công trình: ${(request.projects?.name || '').toUpperCase()}`
            worksheet.getCell('A4').value = `ITEM/Hạng mục: ${request.item || ''}    Task No./NVXS: ${request.task_no || ''}`
            worksheet.getCell('A5').value = 'REQUESTED BY/Đơn vị yêu cầu:'
            worksheet.getCell('A6').value = request.requested_by || ''
            worksheet.getCell('A7').value = 'TO/Gửi đến:'
            worksheet.getCell('B8').value = request.inspector_company || ''
            worksheet.getCell('H3').value = request.request_no || ''
            worksheet.getCell('J3').value = `${request.projects?.code || ''}-${request.request_no || ''}`
            worksheet.getCell('H5').value = request.request_time || ''
            worksheet.getCell('I6').value = request.request_date ? formatDate(request.request_date) : ''
            worksheet.getCell('H7').value = request.inspection_time || ''
            worksheet.getCell('I8').value = request.inspection_date ? formatDate(request.inspection_date) : ''
            worksheet.getCell('A15').value = 'REQUIREMENTS/ Nội dung yêu cầu kiểm tra:'
            applyMethodTicks(worksheet, methods)

            const startRow = 17
            const maxRows = 53

            for (let index = 0; index < maxRows; index += 1) {
                const item = items[index]
                const row = worksheet.getRow(startRow + index)

                row.getCell(1).value = item ? index + 1 : ''
                row.getCell(2).value = item?.drawing_no || ''
                row.getCell(3).value = item?.weld_no || ''
                row.getCell(4).value = item?.weld_type || ''
                row.getCell(5).value = item?.welder_no || ''
                row.getCell(6).value = item?.wps || ''
                row.getCell(7).value = item?.weld_size || ''
                row.getCell(8).value = item?.inspection_required || ''
                row.getCell(9).value = item?.goc_code || ''
                row.getCell(10).value = item?.finish_date || item?.remarks || ''
            }

            const outputBuffer = await workbook.xlsx.writeBuffer()
            saveAs(new Blob([outputBuffer]), `${request.request_no}_REQUEST.xlsx`)
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error)
            alert(`Lỗi xuất Excel: ${message}`)
        }
    }

    const paddedItems = Array.from({ length: Math.max(15, items.length) }, (_, index) => items[index] || null)

    return (
        <div className="print-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
                className="no-print"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
            >
                <Link href="/requests" className="btn btn-secondary">
                    Quay lại danh sách
                </Link>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handlePrint} className="btn btn-primary">
                        In / Xuất PDF
                    </button>
                    <button onClick={handleExportExcel} className="btn btn-success">
                        Xuất Excel
                    </button>
                </div>
            </div>

            <div
                className="print-container"
                style={{
                    background: 'white',
                    padding: '10mm 11mm',
                    color: '#0f172a',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                    borderRadius: '6px',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '0.04em' }}>REQUEST FOR INSPECTION</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '2px' }}>YÊU CẦU KIỂM TRA</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ border: '1px solid #0f172a' }}>
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid #0f172a', fontSize: '0.82rem' }}>
                            <strong>PROJECT/Công trình:</strong> {request.projects?.name || '-'}
                        </div>
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid #0f172a', fontSize: '0.82rem' }}>
                            <strong>ITEM/Hạng mục:</strong> {request.item || '-'}{' '}
                            <span style={{ marginLeft: '14px' }}>
                                <strong>Task No./NVXS:</strong> {request.task_no || '-'}
                            </span>
                        </div>
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid #0f172a', fontSize: '0.82rem' }}>
                            <strong>REQUESTED BY/Đơn vị yêu cầu:</strong> {request.requested_by || '-'}
                        </div>
                        <div style={{ padding: '6px 8px', fontSize: '0.82rem' }}>
                            <strong>TO/Gửi đến:</strong> {request.inspector_company || '-'}
                        </div>
                    </div>

                    <div style={{ border: '1px solid #0f172a' }}>
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid #0f172a', fontSize: '0.82rem' }}>
                            <strong>Request No./Yêu cầu số:</strong> {request.request_no}
                        </div>
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid #0f172a', fontSize: '0.82rem' }}>
                            <strong>Date Request:</strong> {request.request_time || '-'}
                            <div>
                                <strong>Ngày yêu cầu:</strong> {request.request_date ? formatDate(request.request_date) : '-'}
                            </div>
                        </div>
                        <div style={{ padding: '6px 8px', fontSize: '0.82rem' }}>
                            <strong>Date Inspection:</strong> {request.inspection_time || '-'}
                            <div>
                                <strong>Kiểm tra lúc:</strong> {request.inspection_date ? formatDate(request.inspection_date) : '-'}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ border: '1px solid #0f172a', marginBottom: '10px' }}>
                    <div style={{ padding: '6px 8px', borderBottom: '1px solid #0f172a', fontSize: '0.82rem', fontWeight: 700 }}>
                        INSPECTION REQUIRED/Dạng kiểm tra yêu cầu:
                    </div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '8px',
                            padding: '8px 10px 10px',
                            alignItems: 'start',
                        }}
                    >
                        {METHOD_CONFIG.map((method) => (
                            <div key={method.key} style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{method.title}</div>
                                <div style={{ fontSize: '0.78rem', marginTop: '2px', minHeight: '34px' }}>{method.subtitle}</div>
                                <TickBox
                                    checked={methods[method.key]}
                                    label={method.key === 'other' && methods.otherLabel ? methods.otherLabel : undefined}
                                />
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: '0 10px 8px', fontSize: '0.76rem' }}>
                        Tick (√) as applicable/Đánh dấu vào ô cần thiết
                    </div>
                </div>

                <div style={{ border: '1px solid #0f172a', marginBottom: '10px' }}>
                    <div style={{ padding: '6px 8px', borderBottom: '1px solid #0f172a', fontSize: '0.82rem', fontWeight: 700 }}>
                        REQUIREMENTS/ Nội dung yêu cầu kiểm tra: {REQUEST_TYPE_LABELS[request.request_type as keyof typeof REQUEST_TYPE_LABELS] || request.request_type}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                        <thead>
                            <tr>
                                {[
                                    'NN/STT',
                                    'Drawing/Bản vẽ',
                                    'Weld No./Số mối hàn',
                                    'Weld type',
                                    'Welder No./Số thợ hàn',
                                    'WPS/Qui trình',
                                    'Weld Size (mm)/Kích thước',
                                    'Inspection Required/Yêu cầu kiểm tra',
                                    'GOC code',
                                    'Remarks/Finish Date',
                                ].map((header) => (
                                    <th key={header} style={{ border: '1px solid #0f172a', padding: '5px 6px', background: '#f8fafc', textAlign: 'center' }}>
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paddedItems.map((item, index) => (
                                <tr key={item?.weldId || `row-${index}`}>
                                    <td style={{ border: '1px solid #0f172a', padding: '5px 6px', textAlign: 'center', width: '5%' }}>{item ? index + 1 : ''}</td>
                                    <td style={{ border: '1px solid #0f172a', padding: '5px 6px', width: '16%' }}>{item?.drawing_no || ''}</td>
                                    <td style={{ border: '1px solid #0f172a', padding: '5px 6px', width: '10%' }}>{item?.weld_no || ''}</td>
                                    <td style={{ border: '1px solid #0f172a', padding: '5px 6px', width: '8%' }}>{item?.weld_type || ''}</td>
                                    <td style={{ border: '1px solid #0f172a', padding: '5px 6px', width: '14%' }}>{item?.welder_no || ''}</td>
                                    <td style={{ border: '1px solid #0f172a', padding: '5px 6px', width: '12%' }}>{item?.wps || ''}</td>
                                    <td style={{ border: '1px solid #0f172a', padding: '5px 6px', width: '10%' }}>{item?.weld_size || ''}</td>
                                    <td style={{ border: '1px solid #0f172a', padding: '5px 6px', width: '13%' }}>{item?.inspection_required || ''}</td>
                                    <td style={{ border: '1px solid #0f172a', padding: '5px 6px', width: '8%' }}>{item?.goc_code || ''}</td>
                                    <td style={{ border: '1px solid #0f172a', padding: '5px 6px', width: '14%' }}>
                                        {item ? item.finish_date || item.remarks || '' : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px', marginTop: '22px', fontSize: '0.8rem' }}>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: '28px' }}>Requested By</div>
                        <div>{request.requested_by || '________________'}</div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: '28px' }}>QC Inspector</div>
                        <div>________________</div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: '28px' }}>NDT Technician</div>
                        <div>________________</div>
                    </div>
                </div>

                {request.remarks ? (
                    <div style={{ marginTop: '16px', fontSize: '0.8rem' }}>
                        <strong>Ghi chú:</strong> {request.remarks}
                    </div>
                ) : null}
            </div>

            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        @media print {
                            @page {
                                size: A4 portrait;
                                margin: 7mm;
                            }

                            .no-print {
                                display: none !important;
                            }

                            .print-wrapper {
                                padding: 0 !important;
                                gap: 0 !important;
                            }

                            .print-container {
                                box-shadow: none !important;
                                border-radius: 0 !important;
                            }
                        }
                    `,
                }}
            />
        </div>
    )
}
