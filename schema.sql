-- ============================================================
-- WELD CONTROL ONLINE SYSTEM — DATABASE SCHEMA
-- PostgreSQL (Supabase)
-- Project: THIEN NGA – HAI AU PHASE 1 PROJECT
-- Block 12/11, Offshore Vietnam (Vietsovpetro)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles (Thông tin người dùng & role)
-- Extends Supabase auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'dcc', 'qc', 'inspector', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: projects (Thông tin dự án)
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,           -- Mã dự án
  name TEXT NOT NULL,                  -- Tên dự án
  client TEXT,                         -- Chủ đầu tư
  contractor TEXT,                     -- Nhà thầu
  location TEXT,                       -- Vị trí
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Thêm dữ liệu dự án mặc định
INSERT INTO projects (code, name, client, contractor, location) VALUES
(
  'TNHA-PH1',
  'EPCIC FOR THIEN NGA – HAI AU PHASE 1 PROJECT BLOCK 12/11, OFFSHORE VIETNAM',
  'Vietsovpetro',
  'OCD',
  'Block 12/11, Offshore Vietnam'
) ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- TABLE: drawings (Bản vẽ)
-- ============================================================
CREATE TABLE IF NOT EXISTS drawings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_no TEXT NOT NULL,            -- Số bản vẽ (9001-2211-DS-0032-01-WM)
  description TEXT,                   -- Mô tả
  part TEXT,                           -- Bộ phận (JACKET, TOPSIDE, ...)
  nde_percentage TEXT,                -- Tỷ lệ NDT yêu cầu (100%MT & UT)
  total_welds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, drawing_no)
);

CREATE INDEX IF NOT EXISTS idx_drawings_drawing_no ON drawings(drawing_no);
CREATE INDEX IF NOT EXISTS idx_drawings_project_id ON drawings(project_id);

-- ============================================================
-- TABLE: welds (Mối hàn - dữ liệu gốc từ DATA INPUT)
-- ============================================================
CREATE TABLE IF NOT EXISTS welds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_id UUID REFERENCES drawings(id),

  -- Thông tin cơ bản
  weld_id TEXT NOT NULL,               -- ID unique (9001-2211-DS-0032-01-WM1)
  weld_no TEXT NOT NULL,               -- Số mối hàn (1, 17, 17R1)
  drawing_no TEXT NOT NULL,            -- Số bản vẽ
  is_repair BOOLEAN DEFAULT false,     -- Mối hàn sửa chữa (R1, R2, ...)
  repair_no INT DEFAULT 0,             -- Lần sửa thứ mấy

  -- Phân loại
  joint_type TEXT,                     -- Loại mối hàn (DB, DV, SB, X2, X3, SV)
  ndt_requirements TEXT,               -- Yêu cầu NDT (100%MT & UT)
  wps_no TEXT,                         -- Số quy trình hàn (WPS-TNHA-S06)
  goc_code TEXT,                       -- Mã khu vực (ST-22, ST-09)

  -- Kích thước
  weld_length NUMERIC,                 -- Chiều dài mối hàn (mm)
  thickness INT,                       -- Chiều dày (mm)
  weld_size TEXT,                      -- Kích thước tổng (Ø762x15)

  -- Thợ hàn
  welders TEXT,                        -- Danh sách thợ hàn (BGT-0005;BGT-0015)

  -- Fit-Up
  fitup_request_no TEXT,               -- Số yêu cầu kiểm tra Fit-Up (F-044)
  fitup_inspector TEXT,                -- Người kiểm tra Fit-Up
  fitup_date DATE,                     -- Ngày kiểm tra Fit-Up
  fitup_accepted_date DATE,            -- Ngày chấp thuận Fit-Up

  -- Backgouge
  backgouge_request_no TEXT,           -- Số yêu cầu kiểm tra Backgouge (BG-043)
  backgouge_date DATE,                 -- Ngày kiểm tra Backgouge

  -- Visual / Final Visual
  visual_request_no TEXT,              -- Số yêu cầu kiểm tra Visual (V-065)
  visual_inspector TEXT,               -- Người kiểm tra Visual
  visual_date DATE,                    -- Ngày kiểm tra Visual

  -- NDT Results
  fitup_result TEXT CHECK (fitup_result IN ('ACC', 'REJ', 'FINISH', 'N/A', NULL)),
  visual_result TEXT CHECK (visual_result IN ('ACC', 'REJ', 'FINISH', 'N/A', NULL)),
  mt_result TEXT CHECK (mt_result IN ('ACC', 'REJ', 'N/A', NULL)),
  ut_result TEXT CHECK (ut_result IN ('ACC', 'REJ', 'N/A', NULL)),
  rt_result TEXT CHECK (rt_result IN ('ACC', 'REJ', 'N/A', NULL)),
  pwht_result TEXT CHECK (pwht_result IN ('ACC', 'REJ', 'N/A', NULL)),

  -- NDT Report Numbers
  mt_report_no TEXT,                   -- Số báo cáo MT (MT-2211-ST-22-0017)
  ut_report_no TEXT,                   -- Số báo cáo UT (UT-2211-ST-22-0033)
  rt_report_no TEXT,                   -- Số báo cáo RT

  -- Repair data
  repair_length NUMERIC,               -- Chiều dài sửa chữa (mm)

  -- IRN
  irn_no TEXT,                         -- Inspection Release Note (IRN-2211-ST-22-0001)
  irn_date DATE,                       -- Ngày IRN

  -- Trạng thái
  stage TEXT DEFAULT 'fitup'
    CHECK (stage IN ('fitup', 'backgouge', 'lamcheck', 'welding', 'visual', 'mpi', 'ut', 'pwht', 'completed', 'rejected')),
  final_status TEXT CHECK (final_status IN ('OK', 'REPAIR', 'REJECT', NULL)),
  remarks TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),

  UNIQUE(project_id, weld_id)
);

CREATE INDEX IF NOT EXISTS idx_welds_weld_id ON welds(weld_id);
CREATE INDEX IF NOT EXISTS idx_welds_drawing_no ON welds(drawing_no);
CREATE INDEX IF NOT EXISTS idx_welds_project_id ON welds(project_id);
CREATE INDEX IF NOT EXISTS idx_welds_stage ON welds(stage);
CREATE INDEX IF NOT EXISTS idx_welds_final_status ON welds(final_status);
CREATE INDEX IF NOT EXISTS idx_welds_goc_code ON welds(goc_code);
CREATE INDEX IF NOT EXISTS idx_welds_welders ON welds USING gin(to_tsvector('english', coalesce(welders, '')));

-- ============================================================
-- TABLE: inspection_requests (Yêu cầu kiểm tra)
-- Tương ứng với các sheet: FIT UP, BACKGOUGE, LAMCHECK, MPI, REQUEST, VS FINAL
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Thông tin yêu cầu
  request_no TEXT NOT NULL,            -- Số yêu cầu (TNHA-JK-F-146, TNHA-JK-V-154)
  request_type TEXT NOT NULL           -- Loại yêu cầu
    CHECK (request_type IN ('fitup', 'backgouge', 'lamcheck', 'mpi', 'visual', 'final_visual')),
  
  -- Thông tin chung
  item TEXT,                           -- Hạng mục (JACKET)
  task_no TEXT,                        -- Task No (452-25)
  requested_by TEXT,                   -- Đơn vị yêu cầu (QC VSP)
  inspector_company TEXT,              -- Công ty kiểm tra (ZNEPV, HANA NDT)
  
  -- Thời gian
  request_date TIMESTAMPTZ,            -- Ngày yêu cầu
  request_time TEXT,                   -- Giờ yêu cầu
  inspection_date TIMESTAMPTZ,         -- Ngày kiểm tra
  inspection_time TEXT,                -- Giờ kiểm tra
  
  -- Trạng thái
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'scheduled', 'completed', 'cancelled')),
  
  -- Ghi chú
  remarks TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),

  UNIQUE(project_id, request_no)
);

CREATE INDEX IF NOT EXISTS idx_requests_request_no ON inspection_requests(request_no);
CREATE INDEX IF NOT EXISTS idx_requests_type ON inspection_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_requests_status ON inspection_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_project_id ON inspection_requests(project_id);

-- ============================================================
-- TABLE: request_items (Danh sách mối hàn trong yêu cầu)
-- ============================================================
CREATE TABLE IF NOT EXISTS request_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES inspection_requests(id) ON DELETE CASCADE,
  weld_id UUID REFERENCES welds(id),
  
  stt INT,                             -- Số thứ tự
  drawing_no TEXT,                     -- Bản vẽ
  weld_no TEXT,                        -- Số mối hàn
  weld_type TEXT,                      -- Loại mối hàn
  welder_no TEXT,                      -- Thợ hàn
  wps TEXT,                            -- WPS
  weld_size TEXT,                      -- Kích thước
  inspection_required TEXT,            -- Yêu cầu kiểm tra
  goc_code TEXT,                       -- Mã góc/khu vực
  finish_date DATE,                    -- Ngày hoàn thành
  remarks TEXT
);

CREATE INDEX IF NOT EXISTS idx_request_items_request_id ON request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_request_items_weld_id ON request_items(weld_id);

-- ============================================================
-- TABLE: ndt_results (Kết quả kiểm tra NDT)
-- ============================================================
CREATE TABLE IF NOT EXISTS ndt_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weld_id UUID NOT NULL REFERENCES welds(id) ON DELETE CASCADE,
  request_id UUID REFERENCES inspection_requests(id),
  
  -- Loại kiểm tra
  ndt_type TEXT NOT NULL
    CHECK (ndt_type IN ('MT', 'UT', 'RT', 'PT', 'PWHT', 'VISUAL', 'FITUP', 'BACKGOUGE', 'LAMCHECK')),
  
  -- Kết quả
  result TEXT NOT NULL
    CHECK (result IN ('PASS', 'REPAIR', 'REJECT', 'ACC', 'REJ', 'N/A')),
  
  -- Thông tin báo cáo
  report_no TEXT,                      -- Số báo cáo
  test_date DATE,                      -- Ngày kiểm tra
  technician TEXT,                     -- Kỹ thuật viên/Inspector
  company TEXT,                        -- Công ty kiểm tra
  
  -- Chi tiết
  location TEXT,                       -- Vị trí cụ thể
  defect_length NUMERIC,               -- Chiều dài khuyết tật (mm)
  remarks TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_ndt_results_weld_id ON ndt_results(weld_id);
CREATE INDEX IF NOT EXISTS idx_ndt_results_ndt_type ON ndt_results(ndt_type);
CREATE INDEX IF NOT EXISTS idx_ndt_results_result ON ndt_results(result);
CREATE INDEX IF NOT EXISTS idx_ndt_results_test_date ON ndt_results(test_date);

-- ============================================================
-- TABLE: audit_logs (Lịch sử thay đổi)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,            -- Tên bảng bị thay đổi
  record_id TEXT NOT NULL,             -- ID bản ghi
  action TEXT NOT NULL
    CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,                      -- Dữ liệu cũ (trước khi thay đổi)
  new_data JSONB,                      -- Dữ liệu mới (sau khi thay đổi)
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Bảo mật theo người dùng
-- ============================================================

-- Enable RLS trên tất cả bảng
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE welds ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ndt_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies cho profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admin can manage all profiles"
  ON profiles FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policies chung cho data tables: authenticated users có thể đọc
CREATE POLICY "Authenticated users can read projects"
  ON projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read drawings"
  ON drawings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read welds"
  ON welds FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read requests"
  ON inspection_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read request items"
  ON request_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read NDT results"
  ON ndt_results FOR SELECT TO authenticated USING (true);

-- Policies cho write: chỉ admin, dcc, qc
CREATE POLICY "QC and admin can manage welds"
  ON welds FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dcc', 'qc'))
  );

CREATE POLICY "DCC and admin can manage requests"
  ON inspection_requests FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dcc', 'qc'))
  );

CREATE POLICY "DCC and admin can manage request items"
  ON request_items FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dcc', 'qc'))
  );

CREATE POLICY "Inspectors can manage NDT results"
  ON ndt_results FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dcc', 'qc', 'inspector'))
  );

CREATE POLICY "Admin and DCC can manage drawings"
  ON drawings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dcc'))
  );

-- Audit logs: chỉ admin đọc
CREATE POLICY "Admin can read audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Function: Auto update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger cho welds
CREATE TRIGGER welds_updated_at
  BEFORE UPDATE ON welds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger cho inspection_requests
CREATE TRIGGER requests_updated_at
  BEFORE UPDATE ON inspection_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger cho profiles
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function: Auto-create profile khi user đăng ký
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- VIEWS — Dashboard Statistics
-- ============================================================

-- View: Tổng quan số liệu weld
CREATE OR REPLACE VIEW vw_weld_stats AS
SELECT
  p.id AS project_id,
  p.code AS project_code,
  COUNT(w.id) AS total_welds,
  COUNT(w.id) FILTER (WHERE w.final_status = 'OK') AS completed_welds,
  COUNT(w.id) FILTER (WHERE w.mt_result = 'REJ' OR w.ut_result = 'REJ') AS repair_welds,
  COUNT(w.id) FILTER (WHERE w.stage NOT IN ('completed', 'rejected') AND w.final_status IS NULL) AS pending_welds,
  COUNT(w.id) FILTER (WHERE w.is_repair = true) AS total_repairs,
  ROUND(COUNT(w.id) FILTER (WHERE w.final_status = 'OK') * 100.0 / NULLIF(COUNT(w.id), 0), 1) AS completion_percentage
FROM projects p
LEFT JOIN welds w ON w.project_id = p.id
GROUP BY p.id, p.code;

-- View: Số liệu theo drawing
CREATE OR REPLACE VIEW vw_drawing_stats AS
SELECT
  d.id AS drawing_id,
  d.drawing_no,
  d.part,
  d.project_id,
  COUNT(w.id) AS total_welds,
  COUNT(w.id) FILTER (WHERE w.final_status = 'OK') AS completed,
  COUNT(w.id) FILTER (WHERE w.mt_result = 'REJ' OR w.ut_result = 'REJ') AS repairs,
  COUNT(w.id) FILTER (WHERE w.stage NOT IN ('completed', 'rejected') AND w.final_status IS NULL) AS pending
FROM drawings d
LEFT JOIN welds w ON w.drawing_id = d.id
GROUP BY d.id, d.drawing_no, d.part, d.project_id;

-- ============================================================
-- SAMPLE DATA (tùy chọn - có thể bỏ qua nếu dùng import)
-- ============================================================

-- Ví dụ 1 bản ghi để test
-- INSERT INTO welds (project_id, weld_id, weld_no, drawing_no, joint_type, ndt_requirements, wps_no, goc_code, weld_length, thickness, welders, stage)
-- SELECT 
--   p.id,
--   '9001-2211-DS-0032-01-WM1',
--   '1',
--   '9001-2211-DS-0032-01-WM',
--   'DB',
--   '100%MT & UT',
--   'WPS-TNHA-S06',
--   'ST-22',
--   2392.68,
--   25,
--   'BGT-0005;BGT-0015',
--   'completed'
-- FROM projects p WHERE p.code = 'TNHA-PH1';
