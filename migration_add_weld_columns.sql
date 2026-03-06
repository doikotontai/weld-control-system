-- =============================================================
-- MIGRATION: Thêm các cột còn thiếu vào bảng welds
-- File WELD CONTROL.xlsx - Sheet DATA INPUT (40 cột)
-- Chạy file này trong Supabase SQL Editor
-- =============================================================

-- Thêm các cột mới (dùng IF NOT EXISTS để an toàn)
ALTER TABLE welds
  ADD COLUMN IF NOT EXISTS joint_family          TEXT,
  ADD COLUMN IF NOT EXISTS position              TEXT,
  ADD COLUMN IF NOT EXISTS thickness_lamcheck    NUMERIC,
  ADD COLUMN IF NOT EXISTS visual_inspector      TEXT,
  ADD COLUMN IF NOT EXISTS lamcheck_date         DATE,
  ADD COLUMN IF NOT EXISTS lamcheck_request_no   TEXT,
  ADD COLUMN IF NOT EXISTS lamcheck_report_no    TEXT,
  ADD COLUMN IF NOT EXISTS defect_length         NUMERIC,
  ADD COLUMN IF NOT EXISTS overall_status        TEXT,
  ADD COLUMN IF NOT EXISTS ndt_overall_result    TEXT,
  ADD COLUMN IF NOT EXISTS final_visual_date     DATE,
  ADD COLUMN IF NOT EXISTS final_visual_request_no TEXT,
  ADD COLUMN IF NOT EXISTS pwht_result           TEXT,
  ADD COLUMN IF NOT EXISTS fitup_accepted_date   DATE,
  ADD COLUMN IF NOT EXISTS excel_row_order       INT;  -- Số thứ tự dòng trong Excel (để giữ đúng thứ tự khi hiển thị)

-- Sửa weld_no từ TEXT thành INT (nếu chưa là INT)
-- (Bỏ qua nếu đã là INT hoặc có lỗi)
-- ALTER TABLE welds ALTER COLUMN weld_no TYPE INT USING weld_no::int;

-- Kiểm tra kết quả
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'welds' 
ORDER BY ordinal_position;

SELECT 'Migration done!' AS status;
