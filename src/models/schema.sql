-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to enforce clean slate for pivot
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS poll_options CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS question_hashtags CASCADE;

-- USERS TABLE (Anonymous)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    lang VARCHAR(10) DEFAULT 'tr-TR', 
    country VARCHAR(10) DEFAULT 'TR'
);

-- QUESTIONS TABLE (Polls)
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Creator
    text TEXT NOT NULL,
    category VARCHAR(100), -- Main category (optional if using hashtags)
    source_url TEXT,
    
    -- Engagement Metrics (Denormalized for sorting)
    vote_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    engagement_score INT DEFAULT 0, -- Algorithm Score
    
    status VARCHAR(20) DEFAULT 'published',
    language VARCHAR(10) DEFAULT 'tr',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- POLL OPTIONS (Dynamic 2-4 options)
CREATE TABLE poll_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    option_text VARCHAR(255) NOT NULL,
    vote_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- VOTES TABLE
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE, -- Link to specific option
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id) -- One vote per question
);

-- COMMENTS TABLE (Threaded)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For replies
    text TEXT NOT NULL,
    like_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HASHTAGS
CREATE TABLE question_hashtags (
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    hashtag VARCHAR(50) NOT NULL,
    PRIMARY KEY (question_id, hashtag)
);

-- INDEXES
CREATE INDEX idx_questions_engagement ON questions(engagement_score DESC);
CREATE INDEX idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX idx_comments_question_id ON comments(question_id);
