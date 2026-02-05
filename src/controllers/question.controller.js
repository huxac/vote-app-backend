const { pool } = require('../config/db');

// GET /api/v1/questions (Viral Feed)
exports.getQuestions = async (req, res) => {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    try {
        // Fetch questions sorted by Engagement Score (Viral Algo) & Recency
        // Using a weighted score: Engagement * 2 + Recency Factor
        const query = `
            SELECT 
                q.id, q.text, q.category, q.source_url, q.created_at, 
                q.vote_count, q.comment_count, q.user_id as creator_id,
                
                -- Check if current user voted
                (SELECT option_id FROM votes v WHERE v.question_id = q.id AND v.user_id = $1) as user_voted_option,
                
                -- Fetch Options as JSON array
                COALESCE(
                    (SELECT json_agg(json_build_object(
                        'id', po.id, 
                        'text', po.option_text, 
                        'vote_count', po.vote_count,
                        'percentage', CASE WHEN q.vote_count > 0 
                                      THEN ROUND((po.vote_count::numeric / q.vote_count) * 100) 
                                      ELSE 0 END
                    ) ORDER BY po.id) 
                    FROM poll_options po WHERE po.question_id = q.id),
                    '[]'::json
                ) as options

            FROM questions q
            WHERE q.status = 'published'
            ORDER BY 
               -- Viral Algorithm: 
               -- 1. Freshness Boost (First 20 mins get +50 score to jumpstart)
               (CASE WHEN EXTRACT(EPOCH FROM (NOW() - q.created_at)) < 1200 THEN 50 ELSE 0 END) +
               (q.vote_count + q.comment_count * 2) DESC, 
               q.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [userId, limit, offset]);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Fetch Questions X Error:', error);
        res.status(500).json({ error: 'Server error fetching feed' });
    }
};

// POST /api/v1/questions/:id/vote
exports.voteQuestion = async (req, res) => {
    const userId = req.user.id;
    const questionId = req.params.id;
    const { optionId } = req.body; // UUID of the selected option

    if (!optionId) {
        return res.status(400).json({ error: 'Option ID is required' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Record Vote (Ensure unique per user/question via DB constraint)
        await client.query(
            'INSERT INTO votes (user_id, question_id, option_id) VALUES ($1, $2, $3)',
            [userId, questionId, optionId]
        );

        // 2. Increment Counters (Atomic update)
        await client.query('UPDATE questions SET vote_count = vote_count + 1 WHERE id = $1', [questionId]);
        await client.query('UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = $1', [optionId]);

        // 3. Fetch Updated Stats
        const statsRes = await client.query(`
            SELECT 
                po.id, 
                po.vote_count,
                q.vote_count as total_votes
            FROM poll_options po
            JOIN questions q ON q.id = po.question_id
            WHERE po.question_id = $1
        `, [questionId]);

        await client.query('COMMIT');

        // Calculate Percentages
        const total = statsRes.rows.length > 0 ? statsRes.rows[0].total_votes : 0;
        const stats = statsRes.rows.map(row => ({
            id: row.id,
            count: row.vote_count,
            percentage: total > 0 ? Math.round((row.vote_count / total) * 100) : 0
        }));

        res.status(201).json({
            message: 'Vote cast successfully',
            stats: {
                total,
                options: stats
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'You have already voted on this poll' });
        }
        console.error('Vote X Error:', error);
        res.status(500).json({ error: 'Server error casting vote' });
    } finally {
        client.release();
    }
};
// POST /api/v1/questions/create
exports.createQuestion = async (req, res) => {
    const { text, option_a, option_b, category } = req.body;
    const userId = req.user.id; // From auth middleware

    // Basic validation
    if (!text || !option_a || !option_b || !category) {
        return res.status(400).json({ error: 'All fields are required (text, option_a, option_b, category)' });
    }

    try {
        const query = `
            INSERT INTO questions (text, category, status, source_url, user_id)
            VALUES ($1, $2, 'published', NULL, $3)
            RETURNING id
        `;

        const result = await pool.query(query, [text, category, userId]);

        // IMPORTANT: Also create poll_options entries so the vote logic works!
        // The getQuestions query uses 'poll_options' table, not columns option_a/b
        const questionId = result.rows[0].id;

        // Insert options into poll_options table
        const options = [option_a, option_b];
        if (req.body.option_c) options.push(req.body.option_c);
        if (req.body.option_d) options.push(req.body.option_d);

        for (const optText of options) {
            await pool.query(
                'INSERT INTO poll_options (question_id, option_text, vote_count) VALUES ($1, $2, 0)',
                [questionId, optText]
            );
        }

        res.status(201).json({
            message: 'Question created successfully',
            id: questionId
        });

    } catch (error) {
        console.error('Create Question Error:', error);
        res.status(500).json({ error: 'Server error creating question' });
    }
};
