function tambahHari(str, n) {
    const d = new Date(String(str).slice(0, 10) + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

function hariIni() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

module.exports = {
    tambahHari,
    hariIni
}; 