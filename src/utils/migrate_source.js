const { pool } = require('../config/db');

const addSourceUrlColumn = async () => {
    try {
        console.log('⏳ Adding source_url column...');
        await pool.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_url TEXT;`);
        console.log('✅ Column added successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error adding column:', err);
        process.exit(1);
    }
};

addSourceUrlColumn();
