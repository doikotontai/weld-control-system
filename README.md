# Weld Control Online

He thong quan ly tong hop QA/QC/Han/NDT duoc dung lai tu workbook `WELD CONTROL.xlsx`.

## Stack

- Next.js App Router
- React 19
- Supabase (Auth + Postgres)
- ExcelJS / XLSX cho import-export

## Logic nghiep vu da khoa

- `DATA INPUT` la weld master ledger.
- `O` = Fit-Up request key.
- `T` = request moi NDT va khach hang visual.
- `V` = Backgouge request key.
- `X` = Lamcheck request key.
- `P` = ngay hoan thanh han.
- `AJ/AK/AL/AM` = lop release note.
- `REQUEST` la sheet request chuan; `MPI` khong duoc dung lam workflow chuan cua app.

## Chay local

1. Tao file `.env.local` tu `.env.local.example`.
2. Dien du 3 bien moi truong Supabase.
3. Cai dependencies:

```bash
npm install
```

4. Chay dev:

```bash
npm run dev
```

5. Hoac build production local:

```bash
npm run lint
npm run build
npm run start
```

## Bien moi truong bat buoc

Xem file `.env.local.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Khong co fallback key trong source. Thieu env app se fail som.

## SQL / migration can chay tren Supabase

Neu database da ton tai va dang dung schema cu:

1. backup database truoc
2. chay `migration_add_weld_columns.sql`
3. redeploy app

Khong chay lai mu quang `schema.sql` tren database dang co du lieu.

Neu muon tao database moi tu dau:

1. `setup_database.sql`

`schema.sql` chi dung nhu canonical reference schema.

## Tai lieu trien khai

Xem them `HUONG_DAN_TRIEN_KHAI.txt`.
Huong dan cutover truc tiep: `HUONG_DAN_MIGRATION_DB_TRUC_TIEP.md`.

## Kiem tra nhanh truoc deploy

```bash
npm run lint
npm run build
```
