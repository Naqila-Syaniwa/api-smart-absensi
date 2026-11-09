const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function tanggalPanjang(str) {
    if (!str) return '';
    const [y, m, d] = String(str).slice(0, 10).split('-').map(Number);
    return `${d} ${BULAN[m - 1]} ${y}`;
}

const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function tanggalPendek(str) {
    if (!str) return '';
    const [y, m, d] = String(str).slice(0, 10).split('-').map(Number);
    return `${String(d).padStart(2, '0')} ${BULAN_PENDEK[m - 1]} ${y}`;
}

function tambahHari(str, n) {
    const d = new Date(String(str).slice(0, 10) + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

function hariIni() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

module.exports = {
    tanggalPanjang,
    tanggalPendek,
    tambahHari,
    hariIni
}; 