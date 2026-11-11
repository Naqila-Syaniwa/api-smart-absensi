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

Mengembalikan 6 tahap magang untuk komponen stepper, beserta tahap yang sedang aktif.

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
      { "id": 1, "key": "not_started", "title": "Belum Mulai", "start_date": null, "end_date": "2026-07-05", "status": 2 },
      { "id": 2, "key": "start", "title": "Mulai", "start_date": "2026-07-06", "end_date": "2026-07-06", "status": 2 },
      { "id": 3, "key": "pre_intern_documents", "title": "Melengkapi Berkas Pra-Magang", "start_date": "2026-07-07", "end_date": "2026-07-07", "status": 2 },
      {
        "id": 4, "key": "in_progress", "title": "Proses Magang/PKL",
        "start_date": "2026-07-07", "end_date": "2026-12-23", "status": 1,
        "description": "Berkas pra-magang lengkap, kegiatan magang berjalan."
      },
      { "id": 5, "key": "post_intern_documents", "title": "Melengkapi Berkas Pasca Magang", "start_date": "2026-12-24", "end_date": "2026-12-24", "status": 0 },
      { "id": 6, "key": "completed", "title": "Selesai Magang/PKL", "start_date": "2026-12-31", "end_date": "2026-12-31", "status": 0 }
    ]
  }
}
```

### Atribut

| Atribut | Tipe | Keterangan |
|---|---|---|
| `current_stage_key` | string | Kunci tahap aktif |
| `timeline[].id` | integer | Urutan 1 sampai 6 |
| `timeline[].key` | string | `not_started`, `start`, `pre_intern_documents`, `in_progress`, `post_intern_documents`, `completed` |
| `timeline[].title` | string | Judul tahap |
| `timeline[].start_date` | string atau null | Tanggal mulai tahap, format `YYYY-MM-DD`. `null` hanya pada tahap `not_started` |
| `timeline[].end_date` | string | Tanggal akhir tahap, format `YYYY-MM-DD` |
| `timeline[].status` | integer | Lihat tabel status tahap |
| `timeline[].description` | string | Hanya ada pada tahap yang sedang aktif |

### Nilai `status` tahap

| Nilai | Arti |
|---|---|
| `0` | Terkunci |
| `1` | Tahap saat ini |
| `2` | Selesai |

### Aturan Tanggal

- Tahap satu hari (`start`, `pre_intern_documents`, `post_intern_documents`, `completed`) memiliki `start_date` dan `end_date` yang sama.
- `not_started`: `start_date` bernilai `null`, `end_date` adalah sehari sebelum tanggal mulai magang.

### Aturan Penentuan Tahap Aktif

Dibandingkan secara berurutan, berdasarkan tanggal hari ini (zona waktu Asia/Jakarta). Tahap sebelum tahap aktif berstatus `2`, tahap aktif `1`, dan sesudahnya `0`.

| Kondisi | Tahap aktif |
|---|---|
| Hari ini sebelum tanggal mulai | `not_started` |
| Hari ini sama dengan tanggal mulai | `start` |
| Berkas pra-magang belum lengkap | `pre_intern_documents` |
| Hari ini sebelum 7 hari terakhir magang | `in_progress` |
| Hari ini masuk 7 hari terakhir magang | `post_intern_documents` |
| Hari ini sudah melewati tanggal selesai | `completed` |

Berkas pra-magang dianggap lengkap bila `nodin_1_status`, `nodin_2_status`, dan `nodin_permohonan_status` ketiganya bernilai 3. Tanggal mulai dan selesai diambil dari data lamaran.

### Error

| Kode | Pesan |
|---|---|
| 404 | `Jadwal magang tidak ditemukan` |

---

## 3. Informasi Penempatan Magang

`GET /internship/information`

Rincian penempatan, jabatan, program akademik, periode magang, dan pembimbing lapangan.

### Contoh Respons

```json
{
  "status": "success",
  "data": {
    "program_category": "PKL",
    "position": "Judul lowongan yang diikuti peserta",
    "institution_origin": "SMK IDN",
    "study_program": "Rekayasa Perangkat Lunak",
    "start_date": "2026-07-06",
    "end_date": "2026-12-31",
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
| `position` | string atau null | Jabatan atau posisi di tempat magang, diambil dari lowongan yang terhubung dengan peserta |
| `institution_origin` | string | Asal instansi, kampus, atau sekolah |
| `study_program` | string | Jurusan atau program studi |
| `start_date`, `end_date` | string | Tanggal mentah format `YYYY-MM-DD`. Pemformatan tampilan dilakukan di aplikasi |
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
      "start_date": "2026-10-26",
      "end_date": "2026-10-28",
      "mentor": { "name": "Nama Mentor", "username": "nama.mentor" },
      "description": "menampilkan tahapan magang yang sedang dilalui peserta magang",
      "progress_percentage": 100,
      "status": 3,
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
| `start_date` | string | Tanggal mulai tugas, format `YYYY-MM-DD` |
| `end_date` | string | Deadline tugas, format `YYYY-MM-DD` |
| `mentor.name`, `mentor.username` | string | Mentor pemberi tugas |
| `description` | string | Detail tugas |
| `progress_percentage` | integer | 0 sampai 100 |
| `status` | integer | Lihat tabel status |
| `proof_file_url` | string atau null | URL file bukti, `null` jika belum ada |
| `proof_link` | string atau null | Tautan bukti, `null` jika belum ada |

### Nilai `status`

| Nilai | Arti |
|---|---|
| `1` | Belum dikerjakan |
| `2` | Sedang dikerjakan |
| `3` | Selesai |
| `4` | Revisi (hanya bisa ditetapkan mentor lewat portal admin) |

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
| `status` | integer | Ya | `1` (belum dikerjakan), `2` (sedang dikerjakan), atau `3` (selesai) |
| `proof_file` | file | Tidak | PDF, JPG, atau PNG. Maksimum 5 MB (5120 KB) |
| `proof_link` | string | Tidak | URL valid dengan skema `http` atau `https` |

### Aturan Bisnis

- Status `3` (selesai) hanya diterima bersama `progress` bernilai 100.
- Status `4` (revisi) ditolak, karena hanya mentor yang dapat menetapkannya.
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
    "status": 3,
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
| `status` | `Status tidak valid.` |
| `proof_link` | `Format tautan tidak valid.` |
| `proof_file` | `Ukuran file bukti tidak boleh melampaui 5MB.` |
| `proof_file` | `File harus berupa PDF, JPG, atau PNG` |
| `proof_file` | `Field file harus bernama proof_file.` |

### Error Lain

| Kode | Pesan |
|---|---|
| 404 | `Tugas tidak ditemukan` (id tidak ada atau bukan milik peserta) |

---

## 6. Peraturan & Tata Tertib

`GET /internship/rules`

Daftar peraturan dan tata tertib magang. Isinya diambil dari database (`site_settings`, key `peraturan_pkl`), jadi perubahan dari mentor langsung ikut tampil. Peraturan yang sama berlaku untuk semua peserta.

### Contoh Respons

```json
{
  "status": "success",
  "data": {
    "items": [
      "Menjaga nilai-nilai Setjen RI yakni BERAKHLAK (Berorientasi Pelayanan, Akuntabel, Kompeten, Harmonis, Loyal, Adaptif, dan Kolaboratif)",
      "Bersikap sopan dan santun selama di lingkungan Setjen DPR RI",
      "Selalu memakai ID Card/Tanda Pengenal"
    ],
    "updated_at": "2026-07-05T11:55:08.000Z"
  }
}
```

Contoh di atas dipotong. Respons asli berisi seluruh poin.

### Atribut

| Atribut | Tipe | Keterangan |
|---|---|---|
| `items` | array of string | Satu elemen per poin, sesuai urutan. Penomoran dibuat oleh aplikasi |
| `updated_at` | string atau null | Waktu terakhir peraturan diubah (ISO 8601, UTC) |

### Error

| Kode | Pesan |
|---|---|
| 404 | `Peraturan tidak ditemukan` |

---