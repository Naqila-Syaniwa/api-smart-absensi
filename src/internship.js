const express = require('express');
const db = require('./db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { tambahHari, hariIni } = require('./util');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const upload = multer({
    storage: multer.diskStorage({
        destination: path.join(UPLOAD_DIR, 'tugas'),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `tugas_${crypto.randomUUID()}${ext}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        const ok = ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype);
        if (!ok) {
            const err = new Error('File harus berupa PDF, JPG, atau PNG');
            err.code = 'FORMAT_FILE';
            return cb(err);
        }
        cb(null, true);
    },
});

function hapusFile(relPath) {
    if (!relPath) return;
    const full = path.join(UPLOAD_DIR, relPath);
    if (!full.startsWith(UPLOAD_DIR)) return;
    fs.unlink(full, () => {});
}

function error422(res, errors) {
    return res.status(422).json({ status: 'error', message: 'Validasi gagal', errors });
}

// Fungsi untuk mengubah teks HTML menjadi array teks per poin
function htmlKeDaftar(html) {
    const hasil = [];
    const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let m;
    while ((m = re.exec(html || '')) !== null) {
        const teks = m[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .replace(/[;\s]+$/, '')
            .trim();
        if (teks) hasil.push(teks);
    }
    return hasil;
}

// GET /api/v1/internship/information
router.get('/information', async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT p.kategori, l.instansi, l.jurusan, l.tanggal_mulai, l.tanggal_selesai,
                    lw.title AS jabatan,
                    s.nama_satker AS unit_kerja,
                    r.id AS mentor_id, r.nama AS mentor_nama, r.nip AS mentor_nip
             FROM peserta p
             LEFT JOIN lamaran l ON l.id = p.id_lamaran
             LEFT JOIN lowongan lw ON lw.id = p.id_lowongan
             LEFT JOIN satker s ON s.id = p.id_satker
             LEFT JOIN role_as r ON r.id = p.id_mentor
             WHERE p.id = ?`,
             [req.auth.pesertaId]
        );

        if (!rows.length) {
            return res.status(404).json({ status: 'error', message: 'Data peserta tidak ditemukan' });
        }

        const d = rows[0];
        res.json({
            status: 'success',
            data: {
                program_category: d.kategori,
                position: d.jabatan,
                work_unit: d.unit_kerja,
                institution_origin: d.instansi,
                study_program: d.jurusan,
                start_date: d.tanggal_mulai,
                end_date: d.tanggal_selesai,
                mentor: {
                    id: d.mentor_id,
                    name: d.mentor_nama,
                    nip: d.mentor_nip,
                    role: 'Pembimbing Lapangan',
                    status: 'Mentor Aktif'
                },
            },
        });
    } catch (e) {
        next(e);
    }
});

const STATUS = { BELUM_MULAI: 1, SEDANG_DIKERJAKAN: 2, SELESAI: 3, REVISI: 4 };
const STATUS_BOLEH_PESERTA = [STATUS.BELUM_MULAI, STATUS.SEDANG_DIKERJAKAN, STATUS.SELESAI];

function urlBukti(path) {
    if (!path) return null;
    const base = process.env.BASE_URL || '';
    return `${base}/storage/${path}`;
}

router.get('/tasks', async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT t.id, t.judul, t.detail, t.progress, t.status,
                    t.tanggal_mulai, t.deadline, t.bukti_file, t.bukti_link,
                    r.nama AS mentor_nama, r.username AS mentor_username
            FROM tugas_peserta t
            JOIN peserta p ON p.id = t.id_peserta
            LEFT JOIN role_as r ON r.id = p.id_mentor
            WHERE t.id_peserta = ? AND t.deleted_at IS NULL
            ORDER BY t.id DESC`,
            [req.auth.pesertaId]
        );

        const data = rows.map((t) => ({
            id: t.id,
            title: t.judul,
            start_date: t.tanggal_mulai,
            end_date: t.deadline,
            mentor: { name: t.mentor_nama, username: t.mentor_username },
            description: t.detail,
            progress_percentage: t.progress,
            status: t.status,
            proof_file_url: urlBukti(t.bukti_file),
            proof_link: t.bukti_link,
        }));

        res.json({ status: 'success', data });
    } catch (e) {
        next(e);
    }
});

router.post(
    '/tasks/:id/progress',
    (req, res, next) => {
        upload.single('proof_file')(req, res, (err) => {
            if (!err) return next();
            if (err.code === 'LIMIT_FILE_SIZE') {
                return error422(res, { proof_file: ['Ukuran file bukti tidak boleh melampaui 5MB.'] });
            }
            if (err.code === 'FORMAT_FILE') {
                return error422(res, { proof_file: [err.message] });
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return error422(res, { proof_file: ['Field file harus bernama proof_file.'] });
            }
            next(err);
        });
    },
    async (req, res, next) => {
        const fileBaru = req.file ? `tugas/${req.file.filename}` : null;
        try {
            const { progress, status, proof_link } = req.body;
            const errors = {};

            const angka = Number(progress);
            if (progress === undefined || progress === '') {
                errors.progress = ['Progress wajib diisi.'];
            } else if (!Number.isInteger(angka) || angka < 0 || angka > 100) {
                errors.progress = ['Progress harus berupa angka bulat antara 0 sampai 100.'];
            }

            const statusAngka = Number(status);
            if (status === undefined || status === '') {
                errors.status = ['Status wajib diisi.'];
            } else if (!STATUS_BOLEH_PESERTA.includes(statusAngka)) {
                errors.status = ['Status tidak valid.'];
            }

            if (statusAngka === STATUS.SELESAI && !errors.progress && angka !== 100) {
                errors.progress = ['Progress harus 100 jika status Selesai.'];
            }

            if (proof_link) {
                try {
                    const u = new URL(proof_link);
                    if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
                } catch {
                    errors.proof_link = ['Format tautan tidak valid.'];
                }
            }

            if (Object.keys(errors).length) {
                hapusFile(fileBaru);
                return error422(res, errors);
            }

            // Tugas harus milik peserta yang sedang login
            const [rows] = await db.query(
                'SELECT id, bukti_file FROM tugas_peserta WHERE id = ? AND id_peserta = ? AND deleted_at is NULL',
                [req.params.id, req.auth.pesertaId]
            );
            if(!rows.length) {
                hapusFile(fileBaru);
                return res.status(404).json({ status: 'error', message: 'Tugas tidak ditemukan' });
            }

            const buktiLama = rows[0].bukti_file;

            await db.query(
                `UPDATE tugas_peserta
                SET progress = ?, status = ?,
                    bukti_file = COALESCE(?, bukti_file),
                    bukti_link = COALESCE(?, bukti_link),
                    updated_at = NOW()
                WHERE id = ?`,
                [angka, statusAngka, fileBaru, proof_link || null, req.params.id]
            );

            if (fileBaru) hapusFile(buktiLama); // file lama diganti
            
            const [hasil] = await db.query(
                'SELECT id, progress, status, bukti_file, updated_at FROM tugas_peserta WHERE id = ?',
                [req.params.id]
            );
            const t = hasil[0];

            res.json({
                status: 'success',
                message: 'Progress tugas berhasil diperbarui',
                data: {
                    id: t.id,
                    progress_percentage: t.progress,
                    status: t.status,
                    proof_file_url: urlBukti(t.bukti_file),
                    updated_at: new Date(t.updated_at.replace(' ', 'T') + 'Z').toISOString(),
                },
            });
        } catch (e) {
            hapusFile(fileBaru);
            next(e);
        }
    }
);

const STATUS_TAHAP = { LOCKED: 0, CURRENT: 1, COMPLETED: 2 };

// GET /api/v1/internship/timeline
router.get('/timeline', async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT p.nodin_1_status, p.nodin_2_status, p.nodin_permohonan_status,
                    l.tanggal_mulai, l.tanggal_selesai
             FROM peserta p
             LEFT JOIN lamaran l ON l.id = p.id_lamaran
             WHERE p.id = ?`,
            [req.auth.pesertaId]
        );

        if (!rows.length || !rows[0].tanggal_mulai || !rows[0].tanggal_selesai) {
            return res.status(404).json({ status: 'error', message: 'Jadwal magang tidak ditemukan' });
        }

        const d = rows[0];
        const mulai = String(d.tanggal_mulai).slice(0, 10);
        const selesai = String(d.tanggal_selesai).slice(0, 10);
        const pascaMulai = tambahHari(selesai, -7);

        // Digunakan untuk pengembangan
        const boleh_simulasi = process.env.NODE_ENV !== 'production';
        const hari = boleh_simulasi && /^\d{4}-\d{2}-\d{2}$/.test(req.query.tanggal || '')
            ? req.query.tanggal
            : hariIni();

        const preLengkap = [d.nodin_1_status, d.nodin_2_status, d.nodin_permohonan_status]
            .every((s) => s === 3);

        let aktif;
        if (hari < mulai) aktif = 0;
        else if (hari === mulai) aktif = 1;
        else if (!preLengkap) aktif = 2;
        else if (hari < pascaMulai) aktif = 3;
        else if (hari < selesai) aktif = 4;
        else aktif = 5;

        const tahap = [
            ['not_started', 'Belum Mulai', null, tambahHari(mulai, -1), 'Magang belum dimulai.'],
            ['start', 'Mulai', mulai, mulai, 'Hari pertama magang.'],
            ['pre_intern_documents', 'Melengkapi Berkas Pra-Magang', tambahHari(mulai, 1), tambahHari(mulai, 1), 'Lengkapi berkas pra-magang untuk melanjutkan.'],
            ['in_progress', 'Proses Magang/PKL', tambahHari(mulai, 1), tambahHari(pascaMulai, -1), 'Berkas pra-magang lengkap, kegiatan magang berjalan.'],
            ['post_intern_documents', 'Melengkapi Berkas Pasca Magang', pascaMulai, pascaMulai, 'Lengkapi berkas pasca magang.'],
            ['completed', 'Selesai Magang/PKL', selesai, selesai, 'Magang telah selesai.'],
        ];

        const timeline = tahap.map(([key, title, start_date, end_date, description], i) => {
            const item = {
                id: i + 1,
                key,
                title,
                start_date,
                end_date,
                status: i < aktif ? STATUS_TAHAP.COMPLETED : i === aktif ? STATUS_TAHAP.CURRENT : STATUS_TAHAP.LOCKED,
            };
            if (i === aktif) item.description = description;
            return item;
        });

        res.json({
            status: 'success',
            data: { current_stage_key: tahap[aktif][0], timeline },
        });
    } catch (e) {
        next(e);
    }
});

router.get('/rules', async (_req, res, next) => {
    try {
        const [rows] = await db.query(
            "SELECT `value`, updated_at FROM site_settings WHERE `key` = 'peraturan_pkl' LIMIT 1"
        );

        if (!rows.length) {
            return res.status(404).json({ status: 'error', message: 'Peraturan tidak ditemukan' });
        }

        const r = rows[0];
        res.json({
            status: 'success',
            data: {
                items: htmlKeDaftar(r.value),
                updated_at: r.updated_at ? new Date(r.updated_at.replace(' ', 'T') + 'Z').toISOString() : null,
            },
        });
    } catch (e) {
        next(e);
    }
});

module.exports = router;