require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan'); 

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Folder file bukti nanti disajikan di /storage
app.use('/storage', express.static(path.join(__dirname, '..', 'uploads')));

// Endpoint pengecekan
app.get('/api/v1/ping', (_req, res) => {
    res.json({ status: 'success', message: 'API lokal Magang berjalan'});
});

const auth = require('./auth');
app.use('/api/v1/internship', auth, require('./internship'));

// Jika endpoint tidak ada
app.use((_req, res) => {
    res.status(404).json({ status: 'error', message: 'Endpoint tidak ditemukan'});
});

// Jika terjadi error di server
app.use((e, _req, res, _next) => {
    if (e.type === 'entity.parse.failed') {
        return res.status(400).json({ status: 'error', message: 'Format JSON tidak valid' });
    }
    console.error(e);
    res.status(500).json({ status: 'error', message: 'Terjadi kesalahan di server' });
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0',() => {
    console.log(`API berjalan di http://localhost:${port}/api/v1`);
});