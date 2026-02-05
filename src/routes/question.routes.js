const express = require('express');
const router = express.Router();
const questionController = require('../controllers/question.controller');
const authenticate = require('../middlewares/auth.middleware');

// Protected Routes
router.get('/', authenticate, questionController.getQuestions);
router.post('/:id/vote', authenticate, questionController.voteQuestion);

// POST /api/v1/questions/create (New UGC endpoint)
router.post('/create', authenticate, questionController.createQuestion);

module.exports = router;
