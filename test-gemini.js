const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function testGeneration() {
    console.log("Testing generation with gemini-pro...");
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const result = await model.generateContent("Just say 'Worked'");
        console.log("RESPONSE:", result.response.text());

    } catch (err) {
        console.error("GENERATION FAILED:", err);
    }
}

testGeneration();
