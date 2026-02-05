const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { json } = require('express');

// Import routes
const authRoutes = require('./routes/auth.routes');
const questionRoutes = require('./routes/question.routes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(json());

// Routes
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Vote App API is running 🚀' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/comments', require('./routes/comments.routes'));

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
