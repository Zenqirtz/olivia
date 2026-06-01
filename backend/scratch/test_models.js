const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

async function testAllModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('API Key is missing in .env');
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of MODELS) {
    try {
      console.log(`\nTesting model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Halo, siapakah kamu? Jawab dalam satu kalimat saja.');
      console.log(`✅ Success! Response: ${result.response.text().trim()}`);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
}

testAllModels();
