-- ================================================================
-- WELD CONTROL ONLINE SYSTEM — Full Database Setup
-- Copy toàn bộ file này vào Supabase SQL Editor và nhấn Run
-- ================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. BẢNG PROFILES (Người dùng & phân quyền)
-- ================================================================
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS ndt_results CASCADE;
DROP TABLE IF EXISTS inspection_requests CASCADE;
DROP TABLE IF EXISTS welds CASCADE;
DROP TABLE IF EXISTS drawings CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('admin','dcc','qc','inspector','viewer')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ================================================================
-- 2. TRIGGER: Tự tạo profile khi user đăng ký
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'viewer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- 3. TRIGGER: updated_at tự động
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ================================================================
-- 4. BẢNG PROJECTS
-- ================================================================
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  client      TEXT,
  contractor  TEXT,
  location    TEXT,
  start_date  DATE,
  end_date    DATE,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_all"    ON projects FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO projects (code, name, client, contractor, location) VALUES (
  'TNHA-PH1',
  'EPCIC FOR THIEN NGA – HAI AU PHASE 1 PROJECT',
  'Vietsovpetro', 'OCD', 'Block 12/11, Offshore Vietnam'
) ON CONFLICT (code) DO NOTHING;

-- ================================================================
-- 5. BẢNG DRAWINGS
-- ================================================================
CREATE TABLE drawings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_no  TEXT NOT NULL,
  description TEXT,
  part        TEXT,
  nde_pct     TEXT,
  total_welds INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, drawing_no)
);

ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drawings_select" ON drawings FOR SELECT TO authenticated USING (true);
CREATE POLICY "drawings_all"    ON drawings FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','dcc')));

CREATE INDEX idx_drawings_no  ON drawings(drawing_no);
CREATE INDEX idx_drawings_pid ON drawings(project_id);

-- ================================================================
-- 6. BẢNG WELDS (Dữ liệu mối hàn — DATA INPUT)
-- ================================================================
CREATE TABLE welds (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_id            UUID REFERENCES drawings(id),

  -- Định danh
  weld_id               TEXT NOT NULL,
  weld_no               TEXT NOT NULL,
  drawing_no            TEXT NOT NULL,
  is_repair             BOOLEAN DEFAULT false,
  repair_no             INT DEFAULT 0,

  -- Thông tin kỹ thuật
  joint_type            TEXT,
  ndt_requirements      TEXT,
  wps_no                TEXT,
  goc_code              TEXT,
  weld_length           NUMERIC,
  thickness             INT,
  weld_size             TEXT,
  welders               TEXT,

  -- Fit-Up
  fitup_request_no      TEXT,
  fitup_inspector       TEXT,
  fitup_date            DATE,
  fitup_accepted_date   DATE,
  fitup_result          TEXT CHECK (fitup_result IN ('ACC','REJ','FINISH','N/A') OR fitup_result IS NULL),

  -- Backgouge
  backgouge_request_no  TEXT,
  backgouge_date        DATE,

  -- Visual
  visual_request_no     TEXT,
  visual_inspector      TEXT,
  visual_date           DATE,
  visual_result         TEXT CHECK (visual_result IN ('ACC','REJ','FINISH','N/A') OR visual_result IS NULL),

  -- NDT Results
  mt_result             TEXT CHECK (mt_result IN ('ACC','REJ','N/A') OR mt_result IS NULL),
  ut_result             TEXT CHECK (ut_result IN ('ACC','REJ','N/A') OR ut_result IS NULL),
  rt_result             TEXT CHECK (rt_result IN ('ACC','REJ','N/A') OR rt_result IS NULL),
  pwht_result           TEXT CHECK (pwht_result IN ('ACC','REJ','N/A') OR pwht_result IS NULL),

  -- Report Numbers
  mt_report_no          TEXT,
  ut_report_no          TEXT,
  rt_report_no          TEXT,
  repair_length         NUMERIC,

  -- Final
  irn_no                TEXT,
  irn_date              DATE,
  stage                 TEXT DEFAULT 'fitup'
                          CHECK (stage IN ('fitup','backgouge','lamcheck','welding','visual','mpi','ut','pwht','completed','rejected')),
  final_status          TEXT CHECK (final_status IN ('OK','REPAIR','REJECT') OR final_status IS NULL),
  remarks               TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            UUID REFERENCES profiles(id),
  updated_by            UUID REFERENCES profiles(id),

  UNIQUE(project_id, weld_id)
);

ALTER TABLE welds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "welds_select" ON welds FOR SELECT TO authenticated USING (true);
CREATE POLICY "welds_all"    ON welds FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','dcc','qc')));

CREATE INDEX idx_welds_weld_id   ON welds(weld_id);
CREATE INDEX idx_welds_drawing   ON welds(drawing_no);
CREATE INDEX idx_welds_pid       ON welds(project_id);
CREATE INDEX idx_welds_stage     ON welds(stage);
CREATE INDEX idx_welds_goc       ON welds(goc_code);
CREATE INDEX idx_welds_mt        ON welds(mt_result);
CREATE INDEX idx_welds_ut        ON welds(ut_result);

DROP TRIGGER IF EXISTS welds_updated_at ON welds;
CREATE TRIGGER welds_updated_at
  BEFORE UPDATE ON welds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ================================================================
-- 7. INSPECTION REQUESTS (Yêu cầu kiểm tra)
-- ================================================================
CREATE TABLE inspection_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  request_no        TEXT NOT NULL,
  request_type      TEXT NOT NULL
                      CHECK (request_type IN ('fitup','backgouge','lamcheck','mpi','visual','final_visual')),
  item              TEXT,
  task_no           TEXT,
  requested_by      TEXT,
  inspector_company TEXT,
  request_date      TIMESTAMPTZ,
  request_time      TEXT,
  inspection_date   TIMESTAMPTZ,
  inspection_time   TEXT,
  status            TEXT DEFAULT 'draft'
                      CHECK (status IN ('draft','submitted','scheduled','completed','cancelled')),
  remarks           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id),
  UNIQUE(project_id, request_no)
);

ALTER TABLE inspection_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "req_select" ON inspection_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "req_all"    ON inspection_requests FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','dcc','qc')));

DROP TRIGGER IF EXISTS requests_updated_at ON inspection_requests;
CREATE TRIGGER requests_updated_at
  BEFORE UPDATE ON inspection_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ================================================================
-- 8. NDT RESULTS (Kết quả kiểm tra NDT)
-- ================================================================
CREATE TABLE ndt_results (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weld_id       UUID NOT NULL REFERENCES welds(id) ON DELETE CASCADE,
  request_id    UUID REFERENCES inspection_requests(id),
  ndt_type      TEXT NOT NULL
                  CHECK (ndt_type IN ('MT','UT','RT','PT','PWHT','VISUAL','FITUP','BACKGOUGE','LAMCHECK')),
  result        TEXT NOT NULL
                  CHECK (result IN ('PASS','REPAIR','REJECT','ACC','REJ','N/A')),
  report_no     TEXT,
  test_date     DATE,
  technician    TEXT,
  company       TEXT,
  location      TEXT,
  defect_length NUMERIC,
  remarks       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    UUID REFERENCES profiles(id)
);

ALTER TABLE ndt_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ndt_select" ON ndt_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "ndt_all"    ON ndt_results FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','dcc','qc','inspector')));

-- ================================================================
-- 9. AUDIT LOGS
-- ================================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name  TEXT NOT NULL,
  record_id   TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  changed_by  UUID REFERENCES profiles(id),
  changed_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select" ON audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ================================================================
-- 10. VIEW THỐNG KÊ DASHBOARD
-- ================================================================
CREATE OR REPLACE VIEW vw_weld_stats AS
SELECT
  p.id                                                                    AS project_id,
  p.code                                                                  AS project_code,
  COUNT(w.id)                                                             AS total_welds,
  COUNT(w.id) FILTER (WHERE w.final_status = 'OK')                       AS completed_welds,
  COUNT(w.id) FILTER (WHERE w.mt_result = 'REJ' OR w.ut_result = 'REJ') AS repair_welds,
  COUNT(w.id) FILTER (WHERE w.stage NOT IN ('completed','rejected')
                        AND w.final_status IS NULL)                       AS pending_welds,
  COUNT(w.id) FILTER (WHERE w.is_repair = true)                          AS total_repairs,
  ROUND(COUNT(w.id) FILTER (WHERE w.final_status = 'OK')
        * 100.0 / NULLIF(COUNT(w.id), 0), 1)                            AS completion_percentage
FROM projects p
LEFT JOIN welds w ON w.project_id = p.id
GROUP BY p.id, p.code;

-- ================================================================
-- XONG! Database đã sẵn sàng.
-- Bây giờ vào Authentication → Users → Add user để tạo tài khoản
-- ================================================================
SELECT 'Database setup completed!' AS status, NOW() AS at;
