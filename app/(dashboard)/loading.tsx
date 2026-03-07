export default function DashboardLoading() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
            <p style={{ marginTop: '16px', color: '#64748b', fontWeight: 500, fontSize: '0.9rem' }}>Đang tải dữ liệu, vui lòng đợi...</p>
        </div>
    )
}
