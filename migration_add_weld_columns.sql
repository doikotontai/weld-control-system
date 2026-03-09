-- =============================================================
-- DIRECT MIGRATION: legacy schema -> canonical workbook business model
-- Run this in Supabase SQL Editor before deploying the new app build.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'drawings' AND column_name = 'nde_percentage'
  ) THEN
    EXECUTE 'ALTER TABLE public.drawings RENAME COLUMN nde_percentage TO nde_pct';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'welds' AND column_name = 'fitup_accepted_date'
  ) THEN
    EXECUTE 'ALTER TABLE public.welds RENAME COLUMN fitup_accepted_date TO weld_finish_date';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'welds' AND column_name = 'visual_request_no'
  ) THEN
    EXECUTE 'ALTER TABLE public.welds RENAME COLUMN visual_request_no TO inspection_request_no';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'welds' AND column_name = 'final_visual_date'
  ) THEN
    EXECUTE 'ALTER TABLE public.welds RENAME COLUMN final_visual_date TO release_final_date';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'welds' AND column_name = 'final_visual_request_no'
  ) THEN
    EXECUTE 'ALTER TABLE public.welds RENAME COLUMN final_visual_request_no TO release_final_request_no';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'welds' AND column_name = 'irn_date'
  ) THEN
    EXECUTE 'ALTER TABLE public.welds RENAME COLUMN irn_date TO release_note_date';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'welds' AND column_name = 'irn_no'
  ) THEN
    EXECUTE 'ALTER TABLE public.welds RENAME COLUMN irn_no TO release_note_no';
  END IF;
END $$;

ALTER TABLE public.welds
  ADD COLUMN IF NOT EXISTS joint_family TEXT,
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS thickness_lamcheck NUMERIC,
  ADD COLUMN IF NOT EXISTS visual_inspector TEXT,
  ADD COLUMN IF NOT EXISTS lamcheck_date DATE,
  ADD COLUMN IF NOT EXISTS lamcheck_request_no TEXT,
  ADD COLUMN IF NOT EXISTS lamcheck_report_no TEXT,
  ADD COLUMN IF NOT EXISTS overall_status TEXT,
  ADD COLUMN IF NOT EXISTS ndt_overall_result TEXT,
  ADD COLUMN IF NOT EXISTS ndt_after_pwht TEXT,
  ADD COLUMN IF NOT EXISTS defect_length NUMERIC,
  ADD COLUMN IF NOT EXISTS release_final_date DATE,
  ADD COLUMN IF NOT EXISTS release_final_request_no TEXT,
  ADD COLUMN IF NOT EXISTS release_note_date DATE,
  ADD COLUMN IF NOT EXISTS release_note_no TEXT,
  ADD COLUMN IF NOT EXISTS cut_off TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS contractor_issue TEXT,
  ADD COLUMN IF NOT EXISTS transmittal_no TEXT,
  ADD COLUMN IF NOT EXISTS mw1_no TEXT,
  ADD COLUMN IF NOT EXISTS excel_row_order INT;

ALTER TABLE public.projects
  DROP COLUMN IF EXISTS created_by;

ALTER TABLE public.inspection_requests
  DROP COLUMN IF EXISTS updated_by;

ALTER TABLE public.audit_logs
  DROP COLUMN IF EXISTS ip_address;

ALTER TABLE public.inspection_requests
  DROP CONSTRAINT IF EXISTS inspection_requests_request_type_check;

UPDATE public.inspection_requests
SET request_type = CASE
  WHEN request_type IN ('mpi', 'visual') THEN 'request'
  WHEN request_type = 'final_visual' THEN 'vs_final'
  ELSE request_type
END
WHERE request_type IN ('mpi', 'visual', 'final_visual');

ALTER TABLE public.inspection_requests
  ADD CONSTRAINT inspection_requests_request_type_check
  CHECK (request_type IN ('fitup', 'request', 'backgouge', 'lamcheck', 'vs_final'));

ALTER TABLE public.welds
  DROP CONSTRAINT IF EXISTS welds_stage_check;

UPDATE public.welds
SET stage = CASE
  WHEN stage IN ('mpi', 'ut', 'pwht') THEN 'ndt'
  WHEN stage = 'visual' AND inspection_request_no IS NOT NULL THEN 'request'
  WHEN stage = 'completed' AND mw1_no IS NOT NULL THEN 'mw1'
  WHEN stage = 'completed' AND cut_off IS NOT NULL THEN 'cutoff'
  WHEN stage = 'completed' AND (release_note_no IS NOT NULL OR release_final_request_no IS NOT NULL) THEN 'release'
  ELSE stage
END
WHERE stage IN ('mpi', 'ut', 'pwht', 'visual', 'completed');

ALTER TABLE public.welds
  ADD CONSTRAINT welds_stage_check
  CHECK (stage IN ('fitup', 'welding', 'visual', 'request', 'backgouge', 'lamcheck', 'ndt', 'release', 'cutoff', 'mw1', 'completed', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_welds_request_no ON public.welds(inspection_request_no);
CREATE INDEX IF NOT EXISTS idx_welds_release_note_no ON public.welds(release_note_no);

DROP VIEW IF EXISTS public.vw_weld_stats;
CREATE VIEW public.vw_weld_stats AS
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
FROM public.projects p
LEFT JOIN public.welds w ON w.project_id = p.id
GROUP BY p.id, p.code;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'welds'
ORDER BY ordinal_position;
