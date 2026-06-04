const https = require('https');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN || '8907343340:AAGcEKEujL36M6NoEp9UAYsfdc4q-qnKOSU';
const chatIds = ['-5003036425'];

console.log('🤖 Telegram Test Script');
console.log('Token:', token);

const sendMessage = (chatId) => {
  return new Promise((resolve) => {
    console.log(`\nTesting Chat ID: ${chatId}...`);
    const message = `🧪 *GardaOva Bot Test*\n\nIni adalah pesan uji coba dari sistem monitoring GardaOva untuk ID: ${chatId}`;

    const payload = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`Status for ${chatId}:`, res.statusCode);
          console.log(`Response for ${chatId}:`, JSON.stringify(parsed, null, 2));
          resolve(parsed.ok);
        } catch (e) {
          console.log(`Response Text for ${chatId}:`, data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`Request Error for ${chatId}:`, error);
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
};

async function run() {
  for (const chatId of chatIds) {
    await sendMessage(chatId);
  }
}

run();
