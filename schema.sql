-- ============================================================
-- WELD CONTROL ONLINE SYSTEM - DATABASE SCHEMA
-- Canonical business model aligned to workbook WELD CONTROL.xlsx
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'dcc', 'qc', 'inspector', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  client TEXT,
  contractor TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drawings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_no TEXT NOT NULL,
  description TEXT,
  part TEXT,
  nde_pct TEXT,
  dossier_transmittal_no TEXT,
  dossier_submission_date DATE,
  dossier_notes TEXT,
  total_welds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, drawing_no)
);

CREATE INDEX IF NOT EXISTS idx_drawings_drawing_no ON drawings(drawing_no);
CREATE INDEX IF NOT EXISTS idx_drawings_project_id ON drawings(project_id);

CREATE TABLE IF NOT EXISTS welds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_id UUID REFERENCES drawings(id),
  weld_id TEXT NOT NULL,
  weld_no TEXT NOT NULL,
  drawing_no TEXT NOT NULL,
  is_repair BOOLEAN DEFAULT false,
  repair_no INT DEFAULT 0,
  joint_family TEXT,
  joint_type TEXT,
  ndt_requirements TEXT,
  position TEXT,
  wps_no TEXT,
  goc_code TEXT,
  weld_length NUMERIC,
  thickness INT,
  thickness_lamcheck NUMERIC,
  weld_size TEXT,
  welders TEXT,
  fitup_request_no TEXT,
  fitup_inspector TEXT,
  fitup_date DATE,
  weld_finish_date DATE,
  fitup_result TEXT CHECK (fitup_result IN ('ACC', 'REJ', 'FINISH', 'N/A') OR fitup_result IS NULL),
  visual_inspector TEXT,
  visual_date DATE,
  inspection_request_no TEXT,
  visual_result TEXT CHECK (visual_result IN ('ACC', 'REJ', 'FINISH', 'N/A') OR visual_result IS NULL),
  backgouge_date DATE,
  backgouge_request_no TEXT,
  lamcheck_date DATE,
  lamcheck_request_no TEXT,
  lamcheck_report_no TEXT,
  overall_status TEXT,
  ndt_overall_result TEXT,
  mt_result TEXT CHECK (mt_result IN ('ACC', 'REJ', 'N/A') OR mt_result IS NULL),
  mt_report_no TEXT,
  ut_result TEXT CHECK (ut_result IN ('ACC', 'REJ', 'N/A') OR ut_result IS NULL),
  ut_report_no TEXT,
  rt_result TEXT CHECK (rt_result IN ('ACC', 'REJ', 'N/A') OR rt_result IS NULL),
  rt_report_no TEXT,
  pwht_result TEXT CHECK (pwht_result IN ('ACC', 'REJ', 'N/A') OR pwht_result IS NULL),
  ndt_after_pwht TEXT,
  defect_length NUMERIC,
  repair_length NUMERIC,
  release_final_date DATE,
  release_final_request_no TEXT,
  release_note_date DATE,
  release_note_no TEXT,
  cut_off TEXT,
  note TEXT,
  contractor_issue TEXT,
  transmittal_no TEXT,
  mw1_no TEXT,
  stage TEXT DEFAULT 'fitup'
    CHECK (stage IN ('fitup', 'welding', 'visual', 'request', 'backgouge', 'lamcheck', 'ndt', 'release', 'cutoff', 'mw1', 'completed', 'rejected')),
  final_status TEXT CHECK (final_status IN ('OK', 'REPAIR', 'REJECT') OR final_status IS NULL),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  excel_row_order INT,
  UNIQUE(project_id, weld_id)
);

CREATE INDEX IF NOT EXISTS idx_welds_weld_id ON welds(weld_id);
CREATE INDEX IF NOT EXISTS idx_welds_drawing_no ON welds(drawing_no);
CREATE INDEX IF NOT EXISTS idx_welds_project_id ON welds(project_id);
CREATE INDEX IF NOT EXISTS idx_welds_stage ON welds(stage);
CREATE INDEX IF NOT EXISTS idx_welds_final_status ON welds(final_status);
CREATE INDEX IF NOT EXISTS idx_welds_goc_code ON welds(goc_code);
CREATE INDEX IF NOT EXISTS idx_welds_request_no ON welds(inspection_request_no);
CREATE INDEX IF NOT EXISTS idx_welds_release_note_no ON welds(release_note_no);

CREATE TABLE IF NOT EXISTS inspection_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  request_no TEXT NOT NULL,
  request_type TEXT NOT NULL
    CHECK (request_type IN ('fitup', 'request', 'backgouge', 'lamcheck', 'vs_final')),
  item TEXT,
  task_no TEXT,
  requested_by TEXT,
  inspector_company TEXT,
  request_date TIMESTAMPTZ,
  request_time TEXT,
  inspection_date TIMESTAMPTZ,
  inspection_time TEXT,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'scheduled', 'completed', 'cancelled')),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(project_id, request_no)
);

CREATE INDEX IF NOT EXISTS idx_requests_request_no ON inspection_requests(request_no);
CREATE INDEX IF NOT EXISTS idx_requests_type ON inspection_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_requests_status ON inspection_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_project_id ON inspection_requests(project_id);

CREATE TABLE IF NOT EXISTS request_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES inspection_requests(id) ON DELETE CASCADE,
  weld_id UUID REFERENCES welds(id) ON DELETE SET NULL,
  stt INT,
  drawing_no TEXT,
  weld_no TEXT,
  weld_type TEXT,
  welder_no TEXT,
  wps TEXT,
  weld_size TEXT,
  inspection_required TEXT,
  goc_code TEXT,
  finish_date DATE,
  remarks TEXT
);

CREATE INDEX IF NOT EXISTS idx_request_items_request_id ON request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_request_items_weld_id ON request_items(weld_id);

CREATE TABLE IF NOT EXISTS ndt_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weld_id UUID NOT NULL REFERENCES welds(id) ON DELETE CASCADE,
  request_id UUID REFERENCES inspection_requests(id),
  ndt_type TEXT NOT NULL
    CHECK (ndt_type IN ('MT', 'UT', 'RT', 'PT', 'PWHT', 'VISUAL', 'FITUP', 'BACKGOUGE', 'LAMCHECK')),
  result TEXT NOT NULL
    CHECK (result IN ('PASS', 'REPAIR', 'REJECT', 'ACC', 'REJ', 'N/A')),
  report_no TEXT,
  test_date DATE,
  technician TEXT,
  company TEXT,
  location TEXT,
  defect_length NUMERIC,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_ndt_results_weld_id ON ndt_results(weld_id);
CREATE INDEX IF NOT EXISTS idx_ndt_results_ndt_type ON ndt_results(ndt_type);
CREATE INDEX IF NOT EXISTS idx_ndt_results_result ON ndt_results(result);
CREATE INDEX IF NOT EXISTS idx_ndt_results_test_date ON ndt_results(test_date);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE welds ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ndt_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admin can manage all profiles"
  ON profiles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

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

CREATE POLICY "QC and admin can manage welds"
  ON welds FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dcc', 'qc')));

CREATE POLICY "DCC and admin can manage requests"
  ON inspection_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dcc', 'qc')));

CREATE POLICY "DCC and admin can manage request items"
  ON request_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dcc', 'qc')));

CREATE POLICY "Inspectors can manage NDT results"
  ON ndt_results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dcc', 'qc', 'inspector')));

CREATE POLICY "Admin and DCC can manage drawings"
  ON drawings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dcc')));

CREATE POLICY "Admin can read audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS welds_updated_at ON welds;
CREATE TRIGGER welds_updated_at
  BEFORE UPDATE ON welds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS requests_updated_at ON inspection_requests;
CREATE TRIGGER requests_updated_at
  BEFORE UPDATE ON inspection_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE VIEW vw_weld_stats AS
SELECT
  p.id AS project_id,
  p.code AS project_code,
  COUNT(w.id) AS total_welds,
  COUNT(w.id) FILTER (
    WHERE w.release_note_no IS NOT NULL
      OR w.stage IN ('release', 'cutoff', 'mw1', 'completed')
      OR w.final_status = 'OK'
  ) AS completed_welds,
  COUNT(w.id) FILTER (
    WHERE w.final_status = 'REPAIR'
      OR w.mt_result = 'REJ'
      OR w.ut_result = 'REJ'
      OR w.rt_result = 'REJ'
  ) AS repair_welds,
  COUNT(w.id) FILTER (
    WHERE w.stage NOT IN ('release', 'cutoff', 'mw1', 'completed', 'rejected')
  ) AS pending_welds,
  COUNT(w.id) FILTER (
    WHERE w.is_repair = true
      OR COALESCE(w.repair_length, 0) > 0
  ) AS total_repairs,
  ROUND(
    COUNT(w.id) FILTER (
      WHERE w.release_note_no IS NOT NULL
        OR w.stage IN ('release', 'cutoff', 'mw1', 'completed')
        OR w.final_status = 'OK'
    ) * 100.0 / NULLIF(COUNT(w.id), 0),
    1
  ) AS completion_percentage
FROM projects p
LEFT JOIN welds w ON w.project_id = p.id
GROUP BY p.id, p.code;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;
