const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/comments.controller');
const authenticate = require('../middlewares/auth.middleware');

// GET /api/v1/comments/:questionId
router.get('/:questionId', authenticate, commentsController.getComments);

// POST /api/v1/comments/:questionId
router.post('/:questionId', authenticate, commentsController.addComment);

module.exports = router;
