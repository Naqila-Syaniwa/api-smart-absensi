const crypto = require('crypto');
const db = require('./db');

module.exports = async (req, res, next) => {
    try {
        const match = (req.headers.authorization || '').match(/^Bearer (.+)$/);
        if (!match) {
            return res.status(401).json({ status: 'error', message: 'Token tidak ditemukan' });
        }

        let plain = match[1].trim();
        if (plain.includes('|')) plain = plain.split('|')[1]; 
        const hash = crypto.createHash('sha256').update(plain).digest('hex');

        const [rows] = await db.query(
            `SELECT t.id AS token_id, u.id AS user_id, p.id AS peserta_id
             FROM personal_access_tokens t
             JOIN users u ON u.id = t.tokenable_id AND u.deleted_at IS NULL
             JOIN peserta p ON p.id_user = u.id AND p.deleted_at IS NULL
             WHERE t.token = ? AND (t.expires_at IS NULL OR t.expires_at > NOW())
             LIMIT 1`,
            [hash]
        );
        
        if (!rows.length) {
            return res.status(401).json({ status: 'error', message: 'Token tidak valid' });
        }

        req.auth = { userId: rows[0].user_id, pesertaId: rows[0].peserta_id };
        db.query('UPDATE personal_access_tokens SET last_used_at = NOW() WHERE id = ?', [rows[0].token_id])
            .catch(() => {});
        next();
    } catch (e) {
        next(e);
    }
};