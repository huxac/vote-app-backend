const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// POST /api/v1/auth/anon
router.post('/anon', authController.anonymousLogin);

module.exports = router;
