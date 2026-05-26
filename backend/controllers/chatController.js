const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// System prompt for the AI assistant
const SYSTEM_PROMPT = `Kamu adalah "Eggspire AI Assistant", asisten cerdas untuk platform Eggspire - Sistem Monitoring Kualitas Telur berbasis IoT.

Tugasmu:
- Menjawab pertanyaan seputar kualitas telur, peternakan ayam petelur, dan manajemen farm
- Membantu pengguna memahami fitur-fitur platform Eggspire
- Memberikan tips dan saran tentang peningkatan kualitas telur
- Menjelaskan cara kerja sistem IoT (ESP32, sensor, AI scanner)
- Menjawab dalam Bahasa Indonesia yang ramah dan profesional

Fitur Eggspire yang bisa kamu jelaskan:
1. Dashboard - melihat statistik telur harian/mingguan
2. Data Kualitas Telur - riwayat scan telur (bagus/jelek/uncertain)
3. Unduh Laporan - generate laporan PDF/Excel
4. Manajemen Akun - kelola user (khusus superadmin)
5. Pengaturan - pengaturan profil dan sistem
6. ESP32 Scanner - perangkat IoT yang scan kualitas telur dengan AI

Aturan:
- Jawab dengan singkat, padat, dan jelas
- Gunakan emoji untuk membuat jawaban lebih menarik
- Jika pertanyaan di luar topik peternakan/Eggspire, arahkan kembali ke topik yang relevan
- Jangan memberikan informasi yang salah tentang peternakan`;

// Models to try in order (fallback)
const MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];

// Store chat histories in memory (per user)
const chatHistories = new Map();

// Try generating with fallback models
const generateWithFallback = async (genAI, fullPrompt) => {
  let lastError = null;

  for (const modelName of MODELS) {
    try {
      console.log(`[Chat] Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(fullPrompt);
      const response = result.response.text();
      console.log(`[Chat] Success with model: ${modelName}`);
      return response;
    } catch (error) {
      console.log(`[Chat] Model ${modelName} failed: ${error.message?.substring(0, 80)}`);
      lastError = error;
    }
  }

  throw lastError;
};

// Send message to AI
const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?.user_id || 'anonymous';

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Pesan tidak boleh kosong',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set in .env');
      return res.status(500).json({
        success: false,
        message: 'Gemini API key belum dikonfigurasi',
      });
    }

    console.log(`[Chat] User ${userId} sent: "${message.substring(0, 50)}..."`);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);

    // Get or initialize chat history for this user
    if (!chatHistories.has(userId)) {
      chatHistories.set(userId, []);
    }
    const history = chatHistories.get(userId);

    // Build the full prompt with history context
    let fullPrompt = SYSTEM_PROMPT + '\n\n';

    // Add conversation history (last 10 exchanges)
    const recentHistory = history.slice(-20);
    if (recentHistory.length > 0) {
      fullPrompt += 'Riwayat percakapan sebelumnya:\n';
      for (const msg of recentHistory) {
        fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}\n`;
      }
      fullPrompt += '\n';
    }

    fullPrompt += `User: ${message}\nAssistant:`;

    // Generate response with fallback models
    const response = await generateWithFallback(genAI, fullPrompt);

    // Save to history
    history.push({ role: 'user', text: message });
    history.push({ role: 'assistant', text: response });

    console.log(`[Chat] AI responded: "${response.substring(0, 50)}..."`);

    res.json({
      success: true,
      data: {
        reply: response,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Chat AI Error:', error.message);

    // Clear session on error
    const userId = req.user?.user_id || 'anonymous';
    chatHistories.delete(userId);

    // Provide helpful error message based on error type
    let userMessage = 'Gagal mendapatkan respons dari AI. Silakan coba lagi.';
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      userMessage = '⏳ Kuota API habis. Silakan tunggu beberapa menit lalu coba lagi, atau gunakan API key baru dari https://aistudio.google.com/apikey';
    } else if (error.message?.includes('API_KEY')) {
      userMessage = '🔑 API key tidak valid. Periksa konfigurasi GEMINI_API_KEY di file .env';
    }

    res.status(500).json({
      success: false,
      message: userMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Clear chat history
const clearChat = (req, res) => {
  try {
    const userId = req.user?.user_id || 'anonymous';
    chatHistories.delete(userId);

    res.json({
      success: true,
      message: 'Riwayat chat berhasil dihapus',
    });
  } catch (error) {
    console.error('Clear Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus riwayat chat',
    });
  }
};

module.exports = {
  sendMessage,
  clearChat,
};
