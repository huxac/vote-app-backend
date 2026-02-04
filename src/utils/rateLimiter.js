/**
 * Simple Rate Limiter for API Calls
 * Prevents exceeding daily/minute quotas
 */

const fs = require('fs');
const path = require('path');

const RATE_LIMIT_FILE = path.join(__dirname, '../../.rate_limit.json');

// Gemini Free Tier Limits (as of 2024):
// - 60 requests per minute (RPM)
// - 1,500 requests per day (RPD)
const LIMITS = {
    perMinute: 15,  // Conservative limit (25% of actual)
    perDay: 500     // Conservative limit (33% of actual)
};

const loadLimits = () => {
    try {
        if (fs.existsSync(RATE_LIMIT_FILE)) {
            return JSON.parse(fs.readFileSync(RATE_LIMIT_FILE, 'utf8'));
        }
    } catch (e) { }
    return { minute: { count: 0, reset: Date.now() }, day: { count: 0, reset: Date.now() } };
};

const saveLimits = (data) => {
    fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(data, null, 2));
};

const canMakeRequest = () => {
    const data = loadLimits();
    const now = Date.now();

    // Reset minute counter if 60 seconds passed
    if (now - data.minute.reset > 60000) {
        data.minute = { count: 0, reset: now };
    }

    // Reset day counter if 24 hours passed
    if (now - data.day.reset > 86400000) {
        data.day = { count: 0, reset: now };
    }

    if (data.minute.count >= LIMITS.perMinute) {
        return { allowed: false, reason: `Rate limit exceeded: ${LIMITS.perMinute} requests per minute` };
    }

    if (data.day.count >= LIMITS.perDay) {
        return { allowed: false, reason: `Daily limit exceeded: ${LIMITS.perDay} requests per day` };
    }

    return { allowed: true };
};

const recordRequest = () => {
    const data = loadLimits();
    const now = Date.now();

    // Reset if needed
    if (now - data.minute.reset > 60000) {
        data.minute = { count: 0, reset: now };
    }
    if (now - data.day.reset > 86400000) {
        data.day = { count: 0, reset: now };
    }

    data.minute.count++;
    data.day.count++;
    saveLimits(data);
};

const getUsage = () => {
    const data = loadLimits();
    return {
        minuteUsed: data.minute.count,
        minuteLimit: LIMITS.perMinute,
        dayUsed: data.day.count,
        dayLimit: LIMITS.perDay
    };
};

module.exports = {
    canMakeRequest,
    recordRequest,
    getUsage
};
