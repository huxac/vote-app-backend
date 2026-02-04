const aiService = require('./ai.service');

const BANNED_WORDS = ['pedofili', 'terör', 'uyuşturucu', 'intihar', 'tecavüz']; // Simple blacklist

/**
 * Evaluates a question for publication eligibility.
 * @param {object} questionData - { text, option_a, option_b }
 * @returns {Promise<object>} - { status: 'PUBLISH' | 'MANUAL_REVIEW' | 'CANCEL', riskScore: number }
 */
const evaluateQuestion = async (questionData) => {
    const fullText = `${questionData.question} ${questionData.option_a} ${questionData.option_b}`;

    // 1. Basic Filter (Banned Words)
    const containsBannedWord = BANNED_WORDS.some(word => fullText.toLowerCase().includes(word));
    if (containsBannedWord) {
        return { status: 'CANCEL', riskScore: 100, reason: 'Banned word detected' };
    }

    // 2. AI Risk Analysis
    const riskScore = await aiService.analyzeRisk(fullText);

    // 3. Decision Logic
    let status = 'CANCEL';
    if (riskScore <= 30) {
        status = 'PUBLISH';
    } else if (riskScore <= 60) {
        status = 'MANUAL_REVIEW';
    }

    return { status, riskScore };
};

module.exports = {
    evaluateQuestion,
};
