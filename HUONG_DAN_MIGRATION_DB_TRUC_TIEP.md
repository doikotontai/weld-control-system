# Direct DB Migration Guide

This project has been switched to the canonical business schema that matches the Excel workflow more closely.

Current code status:
- `npm run lint`: pass
- `npm run build`: pass
- App code now expects the new schema immediately

Because you asked to change straight away, the remaining cutover is:
1. backup current Supabase database
2. run the direct SQL migration
3. redeploy the latest app code
4. smoke test the main routes

## 1. Backup first

In Supabase:
- go to `Database -> Backups` if available on your plan, or export a schema/data snapshot first
- at minimum, save the current schema and export critical tables:
  - `projects`
  - `drawings`
  - `welds`
  - `inspection_requests`
  - `request_items`
  - `ndt_results`
  - `profiles`

If something goes wrong, rollback means restoring this backup.

## 2. Run the direct migration

Open Supabase SQL Editor and run the full contents of:

- [migration_add_weld_columns.sql](C:/Users/Windows/Desktop/QATracking/huongtt/weld-control/migration_add_weld_columns.sql)

This migration does all of the following directly:
- renames legacy columns to business-correct names
- adds missing workbook fields on `welds`
- removes obsolete schema drift on `projects`, `inspection_requests`, `audit_logs`
- rewrites `inspection_requests.request_type` values
- rewrites legacy `welds.stage` values
- rebuilds `vw_weld_stats`
- creates indexes for the new request/release fields

## 3. Verify schema after SQL

After the SQL finishes, check these points in Supabase Schema Visualizer or Table Editor.

### `drawings`
- `nde_pct` exists
- `nde_percentage` no longer exists

### `welds`
These columns must exist:
- `weld_finish_date`
- `inspection_request_no`
- `release_final_date`
- `release_final_request_no`
- `release_note_date`
- `release_note_no`
- `ndt_after_pwht`
- `cut_off`
- `note`
- `contractor_issue`
- `transmittal_no`
- `mw1_no`

These old columns must no longer exist:
- `fitup_accepted_date`
- `visual_request_no`
- `final_visual_date`
- `final_visual_request_no`
- `irn_date`
- `irn_no`

### `inspection_requests`
- `request_type` must accept:
  - `fitup`
  - `request`
  - `backgouge`
  - `lamcheck`
  - `vs_final`

Old values should already be converted by the migration:
- `mpi` -> `request`
- `visual` -> `request`
- `final_visual` -> `vs_final`

### `projects`
- `created_by` must not exist

### `inspection_requests`
- `updated_by` must not exist

### `audit_logs`
- `ip_address` must not exist

## 4. Redeploy app

After the SQL migration is done, redeploy the latest code.

If Vercel is connected to GitHub:
1. push the latest repo changes
2. let Vercel build automatically
3. or press `Redeploy` on the newest deployment

If deploying manually from local:
```powershell
cd C:\Users\Windows\Desktop\QATracking\huongtt\weld-control
vercel --prod
```

Important:
- do the SQL migration before or immediately together with redeploy
- the new code expects the new schema

## 5. Smoke test after deploy

Test these routes in production:
- `/login`
- `/dashboard`
- `/welds`
- `/welds/[id]`
- `/welds/[id]/edit`
- `/requests`
- `/requests/new`
- `/requests/[id]`
- `/import`
- `/reports/summary`
- `/reports/repair-rate`
- `/drawings`
- `/admin`

Check these specific behaviors:
- login works
- weld list loads
- weld detail shows `release_final`, `release_note`, `cut_off`, `mw1`
- weld edit can save the new canonical fields
- request creation uses `inspection_request_no`
- import maps:
  - `P` -> `weld_finish_date`
  - `T` -> `inspection_request_no`
  - `AJ/AK/AL/AM` -> release fields
  - `AO/AP/AQ/AR/AS/AT` -> new close-out fields

## 6. Optional fresh install

If you ever want a clean database from zero instead of migrating:
- use [setup_database.sql](C:/Users/Windows/Desktop/QATracking/huongtt/weld-control/setup_database.sql)

If you want the canonical reference schema only:
- use [schema.sql](C:/Users/Windows/Desktop/QATracking/huongtt/weld-control/schema.sql)

## 7. Rollback

If the live site fails badly after migration:
1. restore Supabase backup
2. redeploy the previous app version

Because this is a direct cutover, rollback is backup-based, not field-by-field.
