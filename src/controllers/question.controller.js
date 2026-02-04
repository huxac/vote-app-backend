const { pool } = require('../config/db');

// GET /api/v1/questions (Fetch next batch of questions)
exports.getQuestions = async (req, res) => {
    const userId = req.user.id; // From Auth Middleware
    const limit = parseInt(req.query.limit) || 10;

    try {
        // Fetch published questions that the user HAS NOT voted on
        const query = `
      SELECT q.id, q.text, q.option_a, q.option_b, q.category, q.source_url, q.created_at
      FROM questions q
      WHERE q.status = 'published'
      AND NOT EXISTS (
        SELECT 1 FROM votes v WHERE v.question_id = q.id AND v.user_id = $1
      )
      ORDER BY q.publish_at DESC
      LIMIT $2
    `;

        const result = await pool.query(query, [userId, limit]);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Fetch Questions Error:', error);
        res.status(500).json({ error: 'Server error fetching questions' });
    }
};

// POST /api/v1/questions/:id/vote
exports.voteQuestion = async (req, res) => {
    const userId = req.user.id;
    const questionId = req.params.id;
    const { choice } = req.body; // 'A' or 'B'

    if (!['A', 'B'].includes(choice)) {
        return res.status(400).json({ error: 'Invalid choice. Must be A or B' });
    }

    try {
        // Record Vote
        await pool.query(
            'INSERT INTO votes (user_id, question_id, choice) VALUES ($1, $2, $3)',
            [userId, questionId, choice]
        );

        // Calculate Real-time Stats (Simple COUNT for MVP, can optimize with Redis later)
        const statsQuery = `
      SELECT 
        SUM(CASE WHEN choice = 'A' THEN 1 ELSE 0 END) as count_a,
        SUM(CASE WHEN choice = 'B' THEN 1 ELSE 0 END) as count_b,
        COUNT(*) as total
      FROM votes
      WHERE question_id = $1
    `;

        const statsRes = await pool.query(statsQuery, [questionId]);
        const { count_a, count_b, total } = statsRes.rows[0];

        // Determine majority status for user
        const userChoiceCount = choice === 'A' ? parseInt(count_a) : parseInt(count_b);
        const percentage = total > 0 ? Math.round((userChoiceCount / total) * 100) : 0;
        const isMajority = percentage >= 50;

        res.status(201).json({
            message: 'Vote cast successfully',
            stats: {
                total: parseInt(total),
                choice_a: parseInt(count_a),
                choice_b: parseInt(count_b),
                percentage_a: total > 0 ? Math.round((parseInt(count_a) / total) * 100) : 0,
                percentage_b: total > 0 ? Math.round((parseInt(count_b) / total) * 100) : 0,
            },
            user_feedback: {
                is_majority: isMajority,
                percentage: percentage
            }
        });

    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'You have already voted on this question' });
        }
        console.error('Vote Error:', error);
        res.status(500).json({ error: 'Server error casting vote' });
    }
};
