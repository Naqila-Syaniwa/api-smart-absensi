# API Lokal SMART APP

API lokal untuk modul magang SMART DPR RI (Express + MySQL).

## Menjalankan

1. Nyalakan MySQL di XAMPP dan pastikan database `db_magang` sudah di-import.
2. Salin pengaturan di `.env` (PORT, BASE_URL, DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME).
3. `npm install`
4. `npm run dev` (restart otomatis saat file disimpan) atau `npm start`.

## Token untuk testing

```
node src/buat-token.js 28
```

Angka 28 adalah `users.id` peserta. Pakai hasilnya di header `Authorization: Bearer TOKEN`.

## Endpoint

Base URL: `http://localhost:3000/api/v1`. Semua endpoint di bawah `/internship` wajib token.

| Method | Path | Fungsi |
|---|---|---|
| GET | `/ping` | cek server (tanpa token) |
| GET | `/internship/timeline` | 6 tahap magang untuk stepper |
| GET | `/internship/information` | penempatan, program, dan mentor |
| GET | `/internship/tasks` | daftar tugas peserta |
| GET | `/internship/rules` | peraturan dan tata tertib magang |
| POST | `/internship/tasks/{id}/progress` | update progres dan bukti (multipart) |

### POST /internship/tasks/{id}/progress

| Field | Tipe | Aturan |
|---|---|---|
| progress | integer | wajib, 0 sampai 100 |
| status | integer | wajib: 1 belum dikerjakan, 2 sedang dikerjakan, 3 selesai, 4 (revisi ditolak, hanya mentor yang bisa menetapkan) |
| proof_file | file | opsional, PDF/JPG/PNG, maks 5 MB |
| proof_link | url | opsional, http atau https |

Status 3 (selesai) hanya diterima bersama progress 100.

## Catatan

- `GET /internship/timeline?tanggal=YYYY-MM-DD` mensimulasikan tanggal tertentu, aktif selama `NODE_ENV` bukan `production`.
- File bukti disimpan di `uploads/tugas` dan disajikan lewat `/storage`.