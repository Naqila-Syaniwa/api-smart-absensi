const crypto = require('crypto');
const db = require('./db');

(async () => {
    const userId = Number(process.argv[2] || 28);
    const plain = crypto.randomBytes(20).toString('hex');
    const hash = crypto.createHash('sha256').update(plain).digest('hex');

    const [r] = await db.query(
        `INSERT INTO personal_access_tokens 
            (tokenable_type, tokenable_id, name, token, abilities, created_at, updated_at)
        VALUES (?, ?, 'tes-lokal', ?, '["*"]', NOW(), NOW())`,
        ['Modules\\Magang\\App\\Models\\User', userId, hash]
    );

    console.log(`Token untuk user ${userId}:`);
    console.log(`${r.insertId}|${plain}`);
    process.exit();
})();