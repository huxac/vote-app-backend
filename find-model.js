const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function findWorkingModel() {
    console.log("🔍 Scanning for working models...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 1. List Models via REST to be sure
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.models) {
            console.log("❌ No models found in list!");
            return;
        }

        console.log(`📋 Found ${data.models.length} models. Testing generation...`);

        // 2. Test Generation for each potentially compatible model
        for (const m of data.models) {
            if (m.supportedGenerationMethods.includes('generateContent')) {
                // Strip 'models/' prefix if present for SDK usage (or keep it, SDK usually handles both)
                // We'll try both name formats
                const name = m.name;
                const shortName = name.replace('models/', '');

                console.log(`\n🧪 Testing: ${shortName}`);

                try {
                    const model = genAI.getGenerativeModel({ model: shortName });
                    const result = await model.generateContent("Hi");
                    const response = await result.response;
                    console.log(`✅ SUCCESS! Working model found: ${shortName}`);
                    console.log(`   Response: ${response.text()}`);
                    return; // Stop at first working model
                } catch (err) {
                    console.log(`❌ Failed: ${err.message.split(' ').slice(0, 10).join(' ')}...`);
                }
            }
        }

        console.log("\n❌ All models failed.");

    } catch (err) {
        console.error("Script Error:", err);
    }
}

findWorkingModel();
