const { pool } = require('../config/db');
const { generateToken } = require('../utils/jwt');
const { v4: uuidv4 } = require('uuid'); // We might need this if we manually insert, but Postgres has default uuid_generate_v4()

exports.anonymousLogin = async (req, res) => {
    const { deviceId } = req.body;

    if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
    }

    try {
        // Check if user exists
        const userRes = await pool.query('SELECT * FROM users WHERE device_id = $1', [deviceId]);

        let user;

        if (userRes.rows.length > 0) {
            // User exists
            user = userRes.rows[0];
            // Update last login
            await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        } else {
            // Create new user
            const newUserRes = await pool.query(
                'INSERT INTO users (device_id) VALUES ($1) RETURNING *',
                [deviceId]
            );
            user = newUserRes.rows[0];
        }

        // Generate Long-lived Token
        const token = generateToken(user.id);

        res.status(200).json({
            message: 'Authenticated successfully',
            token,
            user: {
                id: user.id,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Auth Error:', error);
        res.status(500).json({ error: 'Server error during authentication' });
    }
};
