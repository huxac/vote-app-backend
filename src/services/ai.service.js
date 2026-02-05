const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
const rateLimiter = require('../utils/rateLimiter');

dotenv.config();

// Configure Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Check rate limit before making API call
 */
const checkRateLimit = () => {
    const check = rateLimiter.canMakeRequest();
    if (!check.allowed) {
        throw new Error(`⏱️ RATE LIMIT: ${check.reason}`);
    }
    rateLimiter.recordRequest();
};

/**
 * Generates a question based on a trend or topic.
 * @param {string} trend - The trend or topic to base the question on.
 * @returns {Promise<object>} - The generated question (text, options, category).
 */
const generateQuestionFromTrend = async (trend) => {
    try {
        checkRateLimit(); // Prevent API quota exhaustion

        const prompt = `
      Sen viral, anonim bir oylama uygulaması için provokatif ama hukuki sınırları aşmayan sorular üreten bir asistansın.
      
      GÖREV: "${trend}" konusu ile ilgili toplumu ikiye bolecek, tartışma yaratacak ama hakaret/suç içermeyen bir soru üret.
      
      ÇIKTI FORMATI (JSON):
      {
        "question": "Soru metni buraya",
        "option_a": "Seçenek A",
        "option_b": "Seçenek B",
        "category": "Kategori (örn: Politika, Magazin, Spor, Teknoloji)"
      }
      
      Sadece saf JSON döndür, markdown code block kullanma.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json|```/g, '').trim(); // Clean markdown if present

        return JSON.parse(text);
    } catch (error) {
        console.error('Error generating question with Gemini:', error);
        throw new Error('AI Question Generation Failed');
    }
};

/**
 * Analyzes the risk of a given text.
 * @param {string} text - The text to analyze.
 * @returns {Promise<number>} - Risk score between 0 and 100.
 */
const analyzeRisk = async (text) => {
    try {
        checkRateLimit(); // Prevent API quota exhaustion

        const prompt = `
      Aşağıdaki metni hukuki risk, nefret söylemi, suç isnadı ve toplumsal infiyal riski açısından analiz et.
      0 (Güvenli) ile 100 (Çok Tehlikeli/Yasak) arasında bir puan ver.
      
      METİN: "${text}"
      
      Sadece JSON formatında cevap ver:
      { "score": 15, "reason": "Açıklama" }
       Sadece saf JSON döndür, markdown code block kullanma.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const cleanText = response.text().replace(/```json|```/g, '').trim();

        const jsonRes = JSON.parse(cleanText);
        return jsonRes.score;
    } catch (error) {
        console.error('Error analyzing risk with Gemini:', error);
        return 100; // Fail safe
    }
};

module.exports = {
    generateQuestionFromTrend,
    analyzeRisk,
    getApiUsage: rateLimiter.getUsage
};
