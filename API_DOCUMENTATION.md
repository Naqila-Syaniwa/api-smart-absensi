# Dokumentasi API Lokal Magang

API lokal untuk modul magang SMART DPR RI (Express + MySQL). Kontrak data mengikuti dokumen *Spesifikasi API: Dashboard & Modul Magang Terpadu* (REST V1.3).

## Informasi Umum

| | |
|---|---|
| Base URL | `http://localhost:3000/api/v1` |
| Autentikasi | `Authorization: Bearer {token}` |
| Format respons | `application/json` |
| Format request POST | `multipart/form-data` (untuk upload bukti) |

Semua endpoint di bawah `/internship` wajib token. Peserta ditentukan dari token, jadi tidak ada parameter `user_id` pada request.

### Format Respons

Sukses:

```json
{ "status": "success", "data": { } }
```

Gagal:

```json
{ "status": "error", "message": "Penjelasan error" }
```

Validasi gagal menambahkan objek `errors` berisi daftar pesan per field:

```json
{
  "status": "error",
  "message": "Validasi gagal",
  "errors": { "progress": ["Progress harus 100 jika status Selesai."] }
}
```

### Kode Status

| Kode | Arti |
|---|---|
| 200 | Berhasil |
| 400 | Body JSON tidak valid |
| 401 | Token tidak ada atau tidak valid |
| 404 | Endpoint atau data tidak ditemukan |
| 422 | Validasi gagal |
| 500 | Kesalahan di server |

### Pesan Error Autentikasi

| Kondisi | Respons |
|---|---|
| Header `Authorization` tidak ada | `401` `Token tidak ditemukan` |
| Token tidak cocok atau kedaluwarsa | `401` `Token tidak valid` |

Token boleh dikirim dalam format `id|token` (format Sanctum) atau hanya bagian `token`.

---

## 1. Cek Server

`GET /ping` (tanpa token)

```json
{ "status": "success", "message": "API lokal Magang berjalan" }
```

---

## 2. Timeline Tahapan Magang

`GET /internship/timeline`

Mengembalikan 7 tahap magang untuk komponen stepper, beserta tahap yang sedang aktif.

### Query (opsional, hanya mode pengembangan)

| Parameter | Format | Keterangan |
|---|---|---|
| `tanggal` | `YYYY-MM-DD` | Mensimulasikan tanggal hari ini. Diabaikan jika `NODE_ENV=production`. |

### Contoh Respons

```json
{
  "status": "success",
  "data": {
    "current_stage_key": "in_progress",
    "timeline": [
      { "id": 1, "key": "not_started", "title": "Belum Mulai", "date_info": "Sebelum 06 Jul 2026", "status": "completed" },
      { "id": 2, "key": "start", "title": "Mulai", "date_info": "06 Jul 2026", "status": "completed" },
      { "id": 3, "key": "pre_intern_documents", "title": "Melengkapi Berkas Pra-Magang", "date_info": "07 Jul 2026", "status": "completed" },
      {
        "id": 4, "key": "in_progress", "title": "Proses Magang/PKL",
        "date_info": "07 Jul 2026 - 23 Dec 2026", "status": "current",
        "description": "Berkas pra-magang lengkap, kegiatan magang berjalan."
      },
      { "id": 5, "key": "post_intern_documents", "title": "Melengkapi Berkas Pasca Magang", "date_info": "24 Dec 2026", "status": "locked" },
      { "id": 6, "key": "completed", "title": "Selesai Magang/PKL", "date_info": "31 Dec 2026", "status": "locked" },
      { "id": 7, "key": "certificate", "title": "Sertifikat Magang", "date_info": "Setelah 31 Dec 2026", "status": "locked" }
    ]
  }
}
```

### Atribut

| Atribut | Tipe | Keterangan |
|---|---|---|
| `current_stage_key` | string | Kunci tahap aktif |
| `timeline[].id` | integer | Urutan 1 sampai 7 |
| `timeline[].key` | string | `not_started`, `start`, `pre_intern_documents`, `in_progress`, `post_intern_documents`, `completed`, `certificate` |
| `timeline[].title` | string | Judul tahap |
| `timeline[].date_info` | string | Keterangan jadwal |
| `timeline[].status` | string | `completed`, `current`, atau `locked` |
| `timeline[].description` | string | Hanya ada pada tahap `current` |

### Aturan Penentuan Tahap Aktif

Dibandingkan secara berurutan, berdasarkan tanggal hari ini (zona waktu Asia/Jakarta). Tahap sebelum tahap aktif berstatus `completed`, sesudahnya `locked`.

| Kondisi | Tahap aktif |
|---|---|
| Hari ini sebelum tanggal mulai | `not_started` |
| Hari ini sama dengan tanggal mulai | `start` |
| Berkas pra-magang belum lengkap | `pre_intern_documents` |
| Hari ini sebelum 7 hari terakhir magang | `in_progress` |
| Hari ini masuk 7 hari terakhir magang | `post_intern_documents` |
| Hari ini sudah melewati tanggal selesai, sertifikat belum ada | `completed` |
| Hari ini sudah melewati tanggal selesai, sertifikat sudah ada | `certificate` |

Berkas pra-magang dianggap lengkap bila `nodin_1_status`, `nodin_2_status`, dan `nodin_permohonan_status` ketiganya bernilai 3. Tanggal mulai dan selesai diambil dari data lamaran.

### Error

| Kode | Pesan |
|---|---|
| 404 | `Jadwal magang tidak ditemukan` |

---

## 3. Informasi Penempatan Magang

`GET /internship/information`

Rincian penempatan, program akademik, durasi, dan pembimbing lapangan.

### Contoh Respons

```json
{
  "status": "success",
  "data": {
    "program_category": "PKL",
    "institution_origin": "SMK IDN",
    "study_program": "Rekayasa Perangkat Lunak",
    "start_date": "2026-07-06",
    "end_date": "2026-12-31",
    "duration_label": "6 Juli 2026 - 31 Desember 2026",
    "mentor": {
      "id": 42,
      "name": "Nama Mentor",
      "nip": "199912302026211001",
      "role": "Pembimbing Lapangan",
      "status": "Mentor Aktif"
    }
  }
}
```

### Atribut

| Atribut | Tipe | Keterangan |
|---|---|---|
| `program_category` | string | `Magang`, `PKL`, `Penelitian`, atau `Lainnya` |
| `institution_origin` | string | Asal instansi, kampus, atau sekolah |
| `study_program` | string | Jurusan atau program studi |
| `start_date`, `end_date` | string | Format `YYYY-MM-DD` |
| `duration_label` | string | Rentang waktu dalam bahasa Indonesia |
| `mentor.id` | integer | ID mentor (`role_as.id`) |
| `mentor.name` | string | Nama pembimbing |
| `mentor.nip` | string | NIP pembimbing |
| `mentor.role`, `mentor.status` | string | Bernilai tetap: `Pembimbing Lapangan` dan `Mentor Aktif` |

### Error

| Kode | Pesan |
|---|---|
| 404 | `Data peserta tidak ditemukan` |

---

## 4. Daftar Tugas

`GET /internship/tasks`

Tugas dari mentor milik peserta yang sedang login, diurutkan dari yang terbaru.

### Contoh Respons

```json
{
  "status": "success",
  "data": [
    {
      "id": 66,
      "title": "Membuat fitur tahapan magang",
      "date_range_label": "26 Oct 2026 s.d. 28 Oct 2026",
      "mentor": { "name": "Nama Mentor", "username": "nama.mentor" },
      "description": "menampilkan tahapan magang yang sedang dilalui peserta magang",
      "progress_percentage": 100,
      "status": "Selesai",
      "proof_file_url": "http://localhost:3000/storage/tugas/tugas_xxxx.png",
      "proof_link": null
    }
  ]
}
```

### Atribut

| Atribut | Tipe | Keterangan |
|---|---|---|
| `id` | integer | ID tugas |
| `title` | string | Judul tugas |
| `date_range_label` | string | Rentang tanggal mulai sampai deadline |
| `mentor.name`, `mentor.username` | string | Mentor pemberi tugas |
| `description` | string | Detail tugas |
| `progress_percentage` | integer | 0 sampai 100 |
| `status` | string | Lihat tabel status |
| `proof_file_url` | string atau null | URL file bukti, `null` jika belum ada |
| `proof_link` | string atau null | Tautan bukti, `null` jika belum ada |

### Nilai `status`

| Nilai | Keterangan |
|---|---|
| `Belum Mulai` | Tugas belum dikerjakan |
| `Sedang Dikerjakan` | Tugas sedang berjalan |
| `Selesai` | Tugas selesai |
| `Revisi` | Hanya bisa ditetapkan mentor lewat portal admin |

Jika tidak ada tugas, `data` berupa array kosong `[]`.

---

## 5. Update Progres dan Bukti Tugas

`POST /internship/tasks/{id}/progress`

Content-Type: `multipart/form-data`. Hanya bisa memperbarui tugas milik peserta yang sedang login.

### Parameter Path

| Parameter | Keterangan |
|---|---|
| `id` | ID tugas |

### Field Body

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `progress` | integer | Ya | Bilangan bulat 0 sampai 100 |
| `status` | string | Ya | `Belum Mulai`, `Sedang Dikerjakan`, atau `Selesai` |
| `proof_file` | file | Tidak | PDF, JPG, atau PNG. Maksimum 5 MB (5120 KB) |
| `proof_link` | string | Tidak | URL valid dengan skema `http` atau `https` |

### Aturan Bisnis

- Status `Selesai` hanya diterima bersama `progress` bernilai 100.
- Status `Revisi` ditolak, karena hanya mentor yang dapat menetapkannya.
- Mengunggah `proof_file` baru otomatis menghapus file bukti lama.
- Jika `proof_file` atau `proof_link` tidak dikirim, nilai lamanya dipertahankan.
- Klien Flutter wajib memakai `FormData` multipart saat mengunggah file.

### Contoh Respons Sukses (200)

```json
{
  "status": "success",
  "message": "Progress tugas berhasil diperbarui",
  "data": {
    "id": 66,
    "progress_percentage": 100,
    "status": "Selesai",
    "proof_file_url": "http://localhost:3000/storage/tugas/tugas_xxxx.png",
    "updated_at": "2026-10-28T10:50:00.000Z"
  }
}
```

### Contoh Validasi Gagal (422)

```json
{
  "status": "error",
  "message": "Validasi gagal",
  "errors": {
    "proof_file": ["Ukuran file bukti tidak boleh melampaui 5MB."]
  }
}
```

### Daftar Pesan Validasi

| Field | Pesan |
|---|---|
| `progress` | `Progress wajib diisi.` |
| `progress` | `Progress harus berupa angka bulat antara 0 sampai 100.` |
| `progress` | `Progress harus 100 jika status Selesai.` |
| `status` | `Status wajib diisi.` |
| `status` | `Status harus Belum Mulai, Sedang Dikerjakan, atau Selesai.` |
| `proof_link` | `Format tautan tidak valid.` |
| `proof_file` | `Ukuran file bukti tidak boleh melampaui 5MB.` |
| `proof_file` | `Format file bukti harus PDF, JPG, atau PNG.` |
| `proof_file` | `Field file harus bernama proof_file.` |

### Error Lain

| Kode | Pesan |
|---|---|
| 404 | `Tugas tidak ditemukan` (id tidak ada atau bukan milik peserta) |

---

## Penyimpanan File

File bukti disimpan di folder `uploads/tugas` dan disajikan lewat `GET /storage/{path}`. Nilai `proof_file_url` dibentuk dari `BASE_URL` di file `.env`.

## Contoh Request (cURL)

```
curl.exe -H "Authorization: Bearer TOKEN" http://localhost:3000/api/v1/internship/tasks

curl.exe -X POST -H "Authorization: Bearer TOKEN" ^
  -F "progress=100" -F "status=Selesai" ^
  -F "proof_link=https://drive.google.com/tes" ^
  http://localhost:3000/api/v1/internship/tasks/66/progress
```