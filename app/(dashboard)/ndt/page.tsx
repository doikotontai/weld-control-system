'use client'
// app/(dashboard)/ndt/page.tsx — Nhập kết quả NDT
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NDTType } from '@/types'

export default function NDTPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [weldSearch, setWeldSearch] = useState('')
    const [weldOptions, setWeldOptions] = useState<{ id: string; weld_id: string; drawing_no: string }[]>([])
    const [selectedWeld, setSelectedWeld] = useState<{ id: string; weld_id: string } | null>(null)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    const [form, setForm] = useState({
        ndt_type: 'MT' as NDTType,
        result: 'ACC',
        report_no: '',
        test_date: new Date().toISOString().slice(0, 10),
        technician: '',
        company: '',
        defect_length: '',
        remarks: '',
    })

    // Search welds
    const searchWelds = useCallback(async () => {
        if (!weldSearch || weldSearch.length < 2) { setWeldOptions([]); return }
        const { data } = await supabase
            .from('welds')
            .select('id, weld_id, drawing_no')
            .or(`weld_id.ilike.%${weldSearch}%,weld_no.ilike.%${weldSearch}%`)
            .limit(10)
        setWeldOptions(data || [])
    }, [weldSearch, supabase])

    useEffect(() => { searchWelds() }, [searchWelds])

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedWeld) { setError('Vui lòng chọn mối hàn!'); return }
        setLoading(true); setError(''); setSuccess('')

        // Insert NDT result
        const { error: insErr } = await supabase.from('ndt_results').insert({
            weld_id: selectedWeld.id,
            ndt_type: form.ndt_type,
            result: form.result,
            report_no: form.report_no || null,
            test_date: form.test_date || null,
            technician: form.technician || null,
            company: form.company || null,
            defect_length: form.defect_length ? parseFloat(form.defect_length) : null,
            remarks: form.remarks || null,
        })

        if (insErr) { setError(insErr.message); setLoading(false); return }

        // Update weld NDT result fields
        const updateData: Record<string, string> = {}
        if (form.ndt_type === 'MT') {
            updateData.mt_result = form.result === 'PASS' || form.result === 'ACC' ? 'ACC' : 'REJ'
            updateData.mt_report_no = form.report_no
        }
        if (form.ndt_type === 'UT') {
            updateData.ut_result = form.result === 'PASS' || form.result === 'ACC' ? 'ACC' : 'REJ'
            updateData.ut_report_no = form.report_no
        }
        if (form.ndt_type === 'VISUAL') {
            updateData.visual_result = form.result === 'PASS' || form.result === 'ACC' ? 'ACC' : 'REJ'
            updateData.visual_request_no = form.report_no
        }

        if (Object.keys(updateData).length > 0) {
            await supabase.from('welds').update(updateData).eq('id', selectedWeld.id)
        }

        setSuccess(`✅ Đã ghi kết quả ${form.ndt_type} cho mối hàn ${selectedWeld.weld_id}!`)
        setForm(f => ({ ...f, report_no: '', remarks: '', defect_length: '' }))
        setLoading(false)
    }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>🔬 Nhập kết quả NDT</h1>
                <p style={{ color: '#64748b', marginTop: '4px' }}>Ghi kết quả MT, UT, RT, PWHT, Visual...</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Form */}
                <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '20px', color: '#1e40af' }}>Thông tin kiểm tra</h3>

                    {/* Weld search */}
                    <div style={{ marginBottom: '16px', position: 'relative' }}>
                        <label className="form-label">🔍 Tìm mối hàn *</label>
                        <input
                            className="form-input"
                            value={selectedWeld ? selectedWeld.weld_id : weldSearch}
                            onChange={e => { setWeldSearch(e.target.value); setSelectedWeld(null) }}
                            placeholder="Nhập Weld ID hoặc số mối hàn..."
                        />
                        {weldOptions.length > 0 && !selectedWeld && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100 }}>
                                {weldOptions.map(w => (
                                    <div
                                        key={w.id}
                                        onClick={() => { setSelectedWeld(w); setWeldOptions([]); setWeldSearch('') }}
                                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}
                                    >
                                        <strong>{w.weld_id}</strong>
                                        <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '0.8rem' }}>{w.drawing_no}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedWeld && (
                            <div style={{ marginTop: '4px', padding: '6px 10px', background: '#eff6ff', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#1e40af', fontSize: '0.8rem', fontWeight: 600 }}>✅ {selectedWeld.weld_id}</span>
                                <button type="button" onClick={() => setSelectedWeld(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label className="form-label">Loại kiểm tra (NDT Type) *</label>
                            <select className="form-input" value={form.ndt_type} onChange={e => set('ndt_type', e.target.value)}>
                                <option value="MT">MT — Magnetic Testing</option>
                                <option value="UT">UT — Ultrasonic Testing</option>
                                <option value="RT">RT — Radiographic Testing</option>
                                <option value="PT">PT — Penetrant Testing</option>
                                <option value="PWHT">PWHT — Post Weld Heat Treatment</option>
                                <option value="VISUAL">VISUAL — Kiểm tra ngoại quan</option>
                                <option value="FITUP">FITUP — Kiểm tra lắp ghép</option>
                                <option value="BACKGOUGE">BACKGOUGE — Đục rễ</option>
                                <option value="LAMCHECK">LAMCHECK — Kiểm tra phân lớp</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Kết quả *</label>
                            <select className="form-input" value={form.result} onChange={e => set('result', e.target.value)} style={{ fontWeight: 700, color: form.result === 'ACC' || form.result === 'PASS' ? '#166534' : form.result === 'REJ' || form.result === 'REJECT' ? '#991b1b' : '#92400e' }}>
                                <option value="ACC">✅ ACC — Chấp nhận</option>
                                <option value="REJ">❌ REJ — Từ chối</option>
                                <option value="REPAIR">🔄 REPAIR — Cần sửa chữa</option>
                                <option value="N/A">N/A</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Số báo cáo (Report No.)</label>
                            <input className="form-input" value={form.report_no} onChange={e => set('report_no', e.target.value)} placeholder="MT-2211-ST-22-0017" />
                        </div>
                        <div>
                            <label className="form-label">Ngày kiểm tra</label>
                            <input className="form-input" type="date" value={form.test_date} onChange={e => set('test_date', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Kỹ thuật viên</label>
                            <input className="form-input" value={form.technician} onChange={e => set('technician', e.target.value)} placeholder="Tên Inspector" />
                        </div>
                        <div>
                            <label className="form-label">Công ty kiểm tra</label>
                            <input className="form-input" value={form.company} onChange={e => set('company', e.target.value)} placeholder="HANA NDT, ZNEPV..." />
                        </div>
                        <div>
                            <label className="form-label">Chiều dài khuyết tật (mm)</label>
                            <input className="form-input" type="number" value={form.defect_length} onChange={e => set('defect_length', e.target.value)} placeholder="0 nếu không có" />
                        </div>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <label className="form-label">Ghi chú</label>
                        <textarea className="form-input" rows={3} value={form.remarks} onChange={e => set('remarks', e.target.value)} style={{ resize: 'vertical' }} />
                    </div>

                    {error && <div style={{ padding: '10px', background: '#fee2e2', borderRadius: '6px', color: '#991b1b', marginTop: '12px', fontSize: '0.875rem' }}>{error}</div>}
                    {success && <div style={{ padding: '10px', background: '#dcfce7', borderRadius: '6px', color: '#166534', marginTop: '12px', fontSize: '0.875rem' }}>{success}</div>}

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '16px', width: '100%' }}>
                        {loading ? '⏳ Đang lưu...' : '💾 Ghi kết quả NDT'}
                    </button>
                </form>

                {/* Guide */}
                <div>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                        <h3 style={{ color: '#166534', fontWeight: 600, marginBottom: '12px' }}>✅ Kết quả chấp nhận (ACC)</h3>
                        <p style={{ color: '#166534', fontSize: '0.875rem' }}>Mối hàn đạt yêu cầu kiểm tra. Có thể tiếp tục các bước tiếp theo.</p>
                    </div>
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                        <h3 style={{ color: '#991b1b', fontWeight: 600, marginBottom: '12px' }}>❌ Từ chối (REJ)</h3>
                        <p style={{ color: '#991b1b', fontSize: '0.875rem' }}>Mối hàn không đạt. Cần sửa chữa (repair) và kiểm tra lại. Thêm R1, R2 vào số mối hàn.</p>
                    </div>
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px' }}>
                        <h3 style={{ color: '#92400e', fontWeight: 600, marginBottom: '12px' }}>🔄 Sửa chữa (REPAIR)</h3>
                        <p style={{ color: '#92400e', fontSize: '0.875rem' }}>Mối hàn cần sửa chữa một phần. Ghi nhận chiều dài cần sửa (mm).</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
