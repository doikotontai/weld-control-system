ALTER TABLE public.drawings
ADD COLUMN IF NOT EXISTS dossier_transmittal_no TEXT,
ADD COLUMN IF NOT EXISTS dossier_submission_date DATE,
ADD COLUMN IF NOT EXISTS dossier_notes TEXT;
