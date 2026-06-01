const { GoogleGenerativeAI } = require('@google/generative-ai');
const { executeQuery } = require('../config/database');
require('dotenv').config();

// System prompt untuk GardaOva AI Assistant (Mitigasi Cerdas Toksisitas Amonia)
const SYSTEM_PROMPT = `Kamu adalah "GardaOva AI Engine", sebuah sistem kecerdasan buatan pakar yang tersemat (embedded system) pada platform GardaOva.
Platform ini berfokus pada Pemodelan Korelasi Toksisitas Amonia dan Mutu Telur dengan Intervensi Mitigasi Berbasis Pemrosesan LLM.

Kamu memahami struktur sistem GardaOva secara menyeluruh, termasuk seluruh halaman dan fitur-fiturnya di aplikasi:
1. Halaman Login:
   - Akses masuk aman bagi administrator dan superadministrator.
   - Menggunakan kredensial bawaan: Superadmin (admin@smarternak.com / admin123) atau Admin (admin2@smarternak.com / admin123).

2. Halaman Dashboard (Beranda Utama):
   - Monitoring real-time data sensor IoT (Gas Amonia, Suhu Kandang, dan Kelembapan).
   - Menampilkan status mitigasi otomatis dan tingkat bahaya amonia (misal amonia tinggi di atas 10 ppm butuh mitigasi ventilasi/sekam).
   - Dilengkapi grafik tren historis parameter sensor untuk melihat naik-turun kondisi kandang.
   - Terdapat widget chat asisten (GardaOva AI Engine) yang melayang di pojok kanan bawah.

3. Halaman Data Kualitas Telur (/data-kualitas-telur):
   - Menampilkan tabel riwayat scan kualitas telur secara mendetail: Kode Telur (Egg Code), Tanggal Scan, Kualitas (Bagus/Good, Jelek/Bad, Ragu/Uncertain), Tingkat Kepercayaan AI (AI Confidence), serta dimensi telur (berat, panjang, lebar, tinggi).
   - Memiliki fitur filter data berdasarkan tanggal (menggunakan Date Picker) dan status kualitas (Bagus/Jelek/Semua).
   - Menampilkan ringkasan ringkas (Total Telur, Telur Bagus, Telur Jelek, persentase kualitas bagus).
   - Memiliki tombol "Ekspor Data" untuk mengunduh seluruh log scan kualitas telur.

4. Halaman Unduh Laporan (/unduh-laporan):
   - Memungkinkan pembuatan dan pengunduhan berkas laporan dalam format PDF, Excel (XLSX), atau CSV.
   - Pilihan jenis laporan: Kualitas Telur, Statistik Produksi, atau Riwayat Aktivitas.
   - Konfigurasi periode laporan: 7 hari terakhir, 30 hari terakhir, atau rentang tanggal kustom.
   - Riwayat berkas yang pernah dibuat tercantum di bawah beserta ukuran file, tanggal pembuatan, kedaluwarsa, jumlah diunduh, dan tombol unduh/hapus laporan.

5. Halaman Manajemen Akun (/manajemen-akun) - Khusus Peran Superadmin:
   - Diberikan badge "Super" kuning di menu navigasi. Hanya bisa diakses oleh akun superadmin.
   - Memungkinkan pengelolaan pengguna sistem: menambah administrator baru, mengubah profil admin lain, mengaktifkan/nonaktifkan status akun, serta menghapus akun administrator.

6. Halaman Pengaturan (/pengaturan):
   - Terbagi menjadi dua tab navigasi utama:
     a. Tab Profil: Mengatur Tema Aplikasi (Mode Terang/Gelap), Foto Profil (Avatar), Nama Lengkap, Nomor Telepon, Bio, dan Email (email bersifat read-only).
     b. Tab Akun: Mengubah Password (dilengkapi fitur "Generate password aman") serta opsi menghapus akun (dengan batasan bahwa superadmin utama/id 1 tidak bisa dihapus sendiri).

Tugas Utama Kamu:
1. Melakukan penalaran kontekstual (contextual reasoning) terhadap data lingkungan kandang (Gas Amonia, Suhu, Kelembapan) dan korelasi dampaknya terhadap degradasi mutu telur.
2. Memberikan rekomendasi intervensi mitigasi taktis, spesifik, dan ilmiah langkah-demi-langkah (step-by-step) untuk mencegah penurunan kualitas telur akibat paparan gas amonia (toksisitas).
3. Menjelaskan logika pemodelan korelasi antara parameter sensor IoT (sebagai Data Feeding Layer) dengan keputusan tindakan yang diambil oleh AI.
4. Menjelaskan cara kerja dan seluruh menu navigasi halaman sistem GardaOva di atas kepada pengguna jika ditanya.

Aturan Menjawab:
- JIKA pengguna mengirim sapaan seperti "hai", "halo", "hello", "p", atau sapaan pembuka sejenis, jawablah dengan sapaan balik yang SANGAT SINGKAT, hangat, dan ramah saja untuk memperkenalkan diri sebagai GardaOva AI Engine, tanpa langsung menampilkan analisis data kandang yang panjang lebar (kecuali ditanya). Fokuskan untuk langsung menawarkan bantuan Anda.
- JANGAN PERNAH menggunakan simbol bintang (* atau **) atau format Markdown tebal/miring lainnya dalam jawaban Anda. Tulis dalam bentuk teks biasa (plain text) yang bersih, rapi, terstruktur, dan mudah dibaca tanpa ada karakter asterisk (*) sama sekali.
- Anda memiliki akses penuh ke seluruh data platform GardaOva secara real-time (data sensor kandang, perangkat IoT, data kualitas/scan telur harian, serta batch produksi aktif). Gunakan data ini untuk menjawab pertanyaan spesifik tentang statistik produksi, jumlah scan telur pada tanggal tertentu, status alat, dsb. secara akurat dan informatif.
- Jawab dengan pendekatan ilmiah, solutif, namun tetap taktis dan mudah dipahami oleh pengelola kandang/auditor.
- Fokuskan pembahasan pada bahaya amonia (toksisitas) dan bagaimana tindakan mitigasi yang harus diambil.
- JANGAN memposisikan diri hanya sebagai dashboard monitoring biasa. Posisikan diri sebagai "Sistem Pengambil Keputusan / Decision Support System (DSS)".
- Gunakan emoji penanda (seperti ⚠️, 📊, 🛠️) secara bijak untuk mempertegas tingkat kedaruratan status mitigasi.`;

// Perbaikan nama model resmi sesuai SDK Google
const MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

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

    // Ambil data sensor terkini, statistik harian telur, batch produksi, ringkasan scan, dan perangkat IoT secara real-time
    let dynamicSystemPrompt = SYSTEM_PROMPT;

    // Tambahkan info tanggal hari ini agar AI memahami rentang waktu relatif (hari ini, kemarin, Juni 2026, dll.)
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateFormatted = today.toLocaleDateString('id-ID', options);
    const timeFormatted = today.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    dynamicSystemPrompt += `\n\n[WAKTU REAL-TIME SISTEM HARI INI]:
- Hari/Tanggal: ${dateFormatted}
- Pukul: ${timeFormatted} WIB
(Catatan: Gunakan acuan tanggal di atas untuk menghitung pencocokan tanggal jika pengguna bertanya tentang data historis seperti "kemarin", "hari ini", "1 Juni 2026", dll. Sebagai contoh, jika hari ini adalah 2 Juni 2026, maka "kemarin" atau "1 Juni 2026" merujuk pada tanggal 2026-06-01).`;

    // 1. Ambil data sensor kandang
    try {
      const sensorResult = await executeQuery(`
        SELECT temperature, humidity, ammonia, recorded_at
        FROM sensor_readings
        ORDER BY recorded_at DESC
        LIMIT 1
      `, []);
      
      if (sensorResult.success && sensorResult.data && sensorResult.data.length > 0) {
        const latest = sensorResult.data[0];
        dynamicSystemPrompt += `\n\n[DATA SENSOR REAL-TIME (IoT Data Feeding Layer)]:
- Gas Amonia: ${latest.ammonia} ppm
- Suhu Ruang: ${latest.temperature}°C
- Kelembapan: ${latest.humidity}%
- Waktu Pengukuran Terakhir: ${latest.recorded_at}`;
      }
    } catch (dbError) {
      console.error('[Chat] Failed to query latest sensors:', dbError);
    }

    // 2. Ambil data statistik harian telur langsung dari tabel egg_scans (untuk menghindari kebergantungan pada database view dan memastikan data 100% akurat)
    try {
      const statsResult = await executeQuery(`
        SELECT 
          DATE_FORMAT(scanned_at, '%Y-%m-%d') as scan_date,
          COUNT(*) as total_eggs,
          SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good_eggs,
          SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad_eggs,
          SUM(CASE WHEN quality = 'uncertain' THEN 1 ELSE 0 END) as uncertain_eggs,
          ROUND((SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as good_percentage
        FROM egg_scans
        GROUP BY DATE_FORMAT(scanned_at, '%Y-%m-%d')
        ORDER BY scan_date DESC
        LIMIT 15
      `, []);
      
      if (statsResult.success && statsResult.data && statsResult.data.length > 0) {
        dynamicSystemPrompt += `\n\n[STATISTIK KUALITAS DAN SCAN TELUR HARIAN (15 Hari Terakhir)]:`;
        statsResult.data.forEach(row => {
          dynamicSystemPrompt += `\n- Tanggal ${row.scan_date}: Total Scan = ${row.total_eggs} butir (Baik = ${row.good_eggs}, Buruk = ${row.bad_eggs}, Ragu = ${row.uncertain_eggs}) | Persentase Baik: ${row.good_percentage}%`;
        });
      }
    } catch (dbError) {
      console.error('[Chat] Failed to query daily egg stats from egg_scans:', dbError);
    }

    // 3. Ambil data batch produksi (production_batches) yang aktif dengan format tanggal yang benar
    try {
      const batchResult = await executeQuery(`
        SELECT batch_code, batch_name, DATE_FORMAT(production_date, '%Y-%m-%d') as production_date, total_eggs, good_eggs, bad_eggs, status
        FROM production_batches
        ORDER BY production_date DESC
        LIMIT 5
      `, []);
      
      if (batchResult.success && batchResult.data && batchResult.data.length > 0) {
        dynamicSystemPrompt += `\n\n[BATCH PRODUKSI TELUR (production_batches)]:`;
        batchResult.data.forEach(row => {
          dynamicSystemPrompt += `\n- Kode: ${row.batch_code} | Nama: ${row.batch_name} | Tanggal Mulai: ${row.production_date} | Status: ${row.status} | Total Telur: ${row.total_eggs} | Baik: ${row.good_eggs} | Buruk: ${row.bad_eggs}`;
        });
      }
    } catch (dbError) {
      console.error('[Chat] Failed to query production batches:', dbError);
    }

    // 4. Ambil ringkasan data scan keseluruhan (egg_scans summary)
    try {
      const summaryResult = await executeQuery(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good,
          SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad,
          SUM(CASE WHEN quality = 'uncertain' THEN 1 ELSE 0 END) as uncertain,
          AVG(ai_confidence) as avg_conf,
          AVG(quality_score) as avg_score
        FROM egg_scans
      `, []);
      
      if (summaryResult.success && summaryResult.data && summaryResult.data.length > 0) {
        const sum = summaryResult.data[0];
        dynamicSystemPrompt += `\n\n[RINGKASAN TOTAL SCAN EGG QUALITY (Seluruh Waktu)]:
- Total Akumulasi Scan: ${sum.total} butir
- Kualitas Baik (Good): ${sum.good || 0} butir
- Kualitas Buruk (Bad): ${sum.bad || 0} butir
- Kualitas Ragu (Uncertain): ${sum.uncertain || 0} butir
- Rata-rata Skor Kualitas: ${sum.avg_score ? Number(sum.avg_score).toFixed(2) : 0}%
- Rata-rata Tingkat Kepercayaan AI: ${sum.avg_conf ? (Number(sum.avg_conf) * 100).toFixed(2) : 0}%`;
      }
    } catch (dbError) {
      console.error('[Chat] Failed to query egg scans summary:', dbError);
    }

    // 5. Ambil data perangkat IoT (esp32_devices)
    try {
      const deviceResult = await executeQuery(`
        SELECT device_name, device_type, status, wifi_ssid, ip_address
        FROM esp32_devices
      `, []);
      
      if (deviceResult.success && deviceResult.data && deviceResult.data.length > 0) {
        dynamicSystemPrompt += `\n\n[DAFTAR PERANGKAT IoT GARDANOVA (esp32_devices)]:`;
        deviceResult.data.forEach(row => {
          dynamicSystemPrompt += `\n- Nama Alat: ${row.device_name} | Tipe: ${row.device_type} | Status: ${row.status} | SSID: ${row.wifi_ssid || '-'} | IP: ${row.ip_address || '-'}`;
        });
      }
    } catch (dbError) {
      console.error('[Chat] Failed to query esp32 devices:', dbError);
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
