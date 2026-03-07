-- migration_perf_indexes.sql
-- Optimizing lookup performance on commonly accessed columns

-- 1. Optimizing sort orders for pagination (used across all inspection views)
CREATE INDEX IF NOT EXISTS idx_welds_excel_row ON welds(excel_row_order);

-- 2. Optimizing "IS NOT NULL" dates filtering for specific inspection views
CREATE INDEX IF NOT EXISTS idx_welds_fitup_date ON welds(fitup_date);
CREATE INDEX IF NOT EXISTS idx_welds_visual_date ON welds(visual_date);
CREATE INDEX IF NOT EXISTS idx_welds_backgouge_date ON welds(backgouge_date);
CREATE INDEX IF NOT EXISTS idx_welds_lamcheck_date ON welds(lamcheck_date);
