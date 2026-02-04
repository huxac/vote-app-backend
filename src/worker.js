const { pool } = require('./config/db');
const aiService = require('./services/ai.service');
const riskService = require('./services/risk.service');

// Mock Trends for MVP (In prod, fetch from Twitter/Google Trends API)
const MOCK_TRENDS = [
    'Yapay Zeka İşsizliği',
    'Kripto Para Regülasyonu',
    'Popüler Kültür İkonları',
    'Eğitim Sistemindeki Değişiklikler',
    'Sokak Hayvanları Yasası',
    'Futbol Hakem Hataları',
    'Sosyal Medya Yasakları',
    'Uzaktan Çalışma vs Ofis'
];

const getRandomTrend = () => MOCK_TRENDS[Math.floor(Math.random() * MOCK_TRENDS.length)];

const runWorker = async () => {
    console.log('🚀 AI Worker Started...');

    try {
        // 1. Pick a Trend
        const trend = getRandomTrend();
        console.log(`📊 Analyzing Trend: "${trend}"`);

        // 2. Generate Question
        console.log('🤖 Generating question...');
        const questionData = await aiService.generateQuestionFromTrend(trend);
        console.log('📝 Generated:', questionData.question);

        // 3. Risk Analysis
        console.log('🛡️ Analyzing risk...');
        const evaluation = await riskService.evaluateQuestion(questionData);
        console.log(`🚦 Status: ${evaluation.status} (Score: ${evaluation.riskScore})`);

        // 4. Save to DB
        if (evaluation.status !== 'CANCEL') {
            // Generate source URL for users to learn more
            const sourceUrl = `https://www.google.com/search?q=${encodeURIComponent(trend)}`;

            const query = `
        INSERT INTO questions (text, option_a, option_b, category, risk_score, status, source_url, publish_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id;
      `;

            const values = [
                questionData.question,
                questionData.option_a,
                questionData.option_b,
                questionData.category,
                evaluation.riskScore,
                evaluation.status === 'PUBLISH' ? 'published' : 'pending',
                sourceUrl
            ];

            const res = await pool.query(query, values);
            console.log(`✅ Question saved with ID: ${res.rows[0].id}`);
        } else {
            console.log('❌ Question rejected by Risk Filter.');
        }

    } catch (err) {
        console.error('💥 Worker Error:', err.message);
    } finally {
        // In a real Cron Job, we might not exit, but for this script we do.
        console.log('💤 Worker finished.');
        process.exit(0);
    }
};

// Run immediately if called directly
runWorker();
