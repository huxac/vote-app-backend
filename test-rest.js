const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const model = 'gemini-1.5-flash';
// Back to v1beta as it's the standard for this model
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const data = JSON.stringify({
    contents: [{
        parts: [{ text: "Hello" }]
    }]
});

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-goog-api-key': apiKey // Using header instead of query param
    }
};

const req = https.request(url, options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let responseBody = '';

    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        console.log('BODY:', responseBody);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
