const { pool } = require('../config/db');

// GET /api/v1/comments/:questionId
exports.getComments = async (req, res) => {
    const questionId = req.params.questionId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    try {
        // Fetch comments with nested threading logic (handled via parent_id)
        // For MVP, we fetch linear list and client constructs tree, or just flat feed
        const query = `
            SELECT c.id, c.text, c.created_at, c.parent_id,
                   c.like_count,
                   u.id as user_id -- Anonymous user ID for identifying "OP" or "Self"
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.question_id = $1
            ORDER BY c.created_at ASC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [questionId, limit, offset]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get Comments Error:', error);
        res.status(500).json({ error: 'Server error fetching comments' });
    }
};

// POST /api/v1/comments/:questionId
exports.addComment = async (req, res) => {
    const userId = req.user.id;
    const questionId = req.params.questionId;
    const { text, parentId } = req.body;

    if (!text) return res.status(400).json({ error: 'Comment text required' });

    try {
        const query = `
            INSERT INTO comments (question_id, user_id, text, parent_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, created_at
        `;
        const result = await pool.query(query, [questionId, userId, text, parentId || null]);

        // Increment comment count on question (Atomic)
        await pool.query('UPDATE questions SET comment_count = comment_count + 1 WHERE id = $1', [questionId]);

        res.status(201).json({
            message: 'Comment added',
            comment: {
                id: result.rows[0].id,
                text,
                user_id: userId,
                parent_id: parentId || null,
                created_at: result.rows[0].created_at
            }
        });
    } catch (error) {
        console.error('Add Comment Error:', error);
        res.status(500).json({ error: 'Server error adding comment' });
    }
};
