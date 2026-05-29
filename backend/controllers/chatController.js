const { GoogleGenerativeAI } = require('@google/generative-ai');
const { executeQuery } = require('../config/database');
require('dotenv').config();

// System prompt untuk GardaOva AI Assistant (Mitigasi Cerdas Toksisitas Amonia)
const SYSTEM_PROMPT = `Kamu adalah "GardaOva AI Engine", sebuah sistem kecerdasan buatan pakar yang tersemat (embedded system) pada platform GardaOva.
Platform ini berfokus pada Pemodelan Korelasi Toksisitas Amonia dan Mutu Telur dengan Intervensi Mitigasi Berbasis Pemrosesan LLM.

Tugas Utama Kamu:
1. Melakukan penalaran kontekstual (contextual reasoning) terhadap data lingkungan kandang (Gas Amonia, Suhu, Kelembapan) dan korelasi dampaknya terhadap degradasi mutu telur.
2. Memberikan rekomendasi intervensi mitigasi taktis, spesifik, dan ilmiah langkah-demi-langkah (step-by-step) untuk mencegah penurunan kualitas telur akibat paparan gas amonia (toksisitas).
3. Menjelaskan logika pemodelan korelasi antara parameter sensor IoT (sebagai Data Feeding Layer) dengan keputusan tindakan yang diambil oleh AI.

Komponen Arsitektur GardaOva yang Kamu Kelola:
- Data Feeding Layer (Sensor IoT): Input real-time Amonia (ppm), Suhu (°C), dan Kelembapan (%) sebagai indikator tingkat risiko toksisitas ruang.
- Core Corelation Engine: Menganalisis korelasi data amonia terhadap penurunan indeks kualitas internal telur (degradasi mutu putih/kuning telur).
- Automated Mitigation Hub: Output berupa draf instruksi penanganan kandang (ventilasi, manajemen litter, evakuasi produk) yang diproduksi secara generatif oleh kamu (LLM).

Aturan Menjawab:
- Jawab dengan pendekatan ilmiah, solutif, namun tetap taktis dan mudah dipahami oleh pengelola kandang/auditor.
- Fokuskan pembahasan pada bahaya amonia (toksisitas) dan bagaimana tindakan mitigasi yang harus diambil.
- JANGAN memposisikan diri hanya sebagai dashboard monitoring biasa. Posisikan diri sebagai "Sistem Pengambil Keputusan / Decision Support System (DSS)".
- Gunakan emoji penanda (seperti ⚠️, 📊, 🛠️) secara bijak untuk mempertegas tingkat kedaruratan status mitigasi.`;

// Perbaikan nama model resmi sesuai SDK Google
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

// Store chat histories menggunakan struktur objek resmi Gemini ({ role, parts })
const chatHistories = new Map();

// Helper untuk generate content dengan fallback
const generateWithFallback = async (genAI, modelName, systemInstruction, contents) => {
  console.log(`[Chat] Trying model: ${modelName}`);
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    systemInstruction: systemInstruction // Menggunakan fitur bawaan SDK
  });

  const result = await model.generateContent({ contents });
  return result.response.text();
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

    // Ambil maksimal 10 pertukaran terakhir (20 records) untuk menghemat token
    const recentHistory = history.slice(-20);

    // Menyusun format kontens resmi array objek untuk dikirim ke Gemini
    const formattedContents = [
      ...recentHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model', // SDK menggunakan 'model', bukan 'assistant'
        parts: [{ text: msg.text }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    // Ambil data sensor terkini dari database secara real-time
    let dynamicSystemPrompt = SYSTEM_PROMPT;
    try {
      const sensorResult = await executeQuery(`
        SELECT temperature, humidity, ammonia, recorded_at
        FROM sensor_readings
        ORDER BY recorded_at DESC
        LIMIT 1
      `, []);
      
      if (sensorResult.success && sensorResult.data && sensorResult.data.length > 0) {
        const latest = sensorResult.data[0];
        dynamicSystemPrompt += `\n\n[DATA FEEDING LAYER - IoT SENSOR REAL-TIME]:
- Amonia: ${latest.ammonia} ppm
- Suhu: ${latest.temperature}°C
- Kelembapan: ${latest.humidity}%
- Waktu Pengukuran: ${latest.recorded_at}
Gunakan data riil ini untuk memberikan penalaran dan draf instruksi mitigasi yang sesuai.`;
      }
    } catch (dbError) {
      console.error('[Chat] Failed to query latest sensors for dynamic system prompt:', dbError);
    }

    // Eksekusi dengan Fallback Loop
    let response = null;
    let lastError = null;

    for (const modelName of MODELS) {
      try {
        response = await generateWithFallback(genAI, modelName, dynamicSystemPrompt, formattedContents);
        console.log(`[Chat] Success with model: ${modelName}`);
        break; // Keluar dari loop jika berhasil
      } catch (error) {
        console.log(`[Chat] Model ${modelName} failed: ${error.message?.substring(0, 80)}`);
        lastError = error;
      }
    }

    if (!response) {
      throw lastError;
    }

    // Simpan ke memori lokal dengan format dasar Anda
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
