# Weld Control Online

Hệ thống quản lý tổng hợp QA/QC/Hàn/NDT được dựng lại từ workbook `WELD CONTROL.xlsx`.

## Stack

- Next.js App Router
- React 19
- Supabase (Auth + Postgres)
- ExcelJS / XLSX cho import/export

## Logic nghiệp vụ đã khóa

- `DATA INPUT` là weld master ledger.
- `O` = mã request Fit-Up.
- `T` = request mời NDT và khách hàng visual.
- `V` = mã request Backgouge.
- `X` = mã request Lamcheck.
- `P` = ngày hoàn thành hàn.
- `AJ/AK/AL/AM` = lớp release note.
- `REQUEST` là sheet request chuẩn; `MPI` không được dùng làm workflow chuẩn của app.

## Chạy local

1. Tạo file `.env.local` từ `.env.local.example`.
2. Điền đủ 3 biến môi trường Supabase.
3. Cài dependencies:

```bash
npm install
```

4. Chạy dev:

```bash
npm run dev
```

5. Hoặc build production local:

```bash
npm run lint
npm run build
npm run start
```

## Biến môi trường bắt buộc

Xem file `.env.local.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Không có fallback key trong source. Thiếu env thì app sẽ fail sớm.

## SQL / migration cần chạy trên Supabase

Nếu database đã tồn tại và đang dùng schema cũ:

1. backup database trước
2. chạy `migration_add_weld_columns.sql`
3. redeploy app

Không chạy lại mù quáng `schema.sql` trên database đang có dữ liệu.

Nếu muốn tạo database mới từ đầu:

1. `setup_database.sql`

`schema.sql` chỉ dùng như canonical reference schema.

## Tài liệu triển khai

Xem thêm `HUONG_DAN_TRIEN_KHAI.txt`.
Hướng dẫn cutover trực tiếp: `HUONG_DAN_MIGRATION_DB_TRUC_TIEP.md`.

## Kiểm tra nhanh trước deploy

```bash
npm run lint
npm run build
```
