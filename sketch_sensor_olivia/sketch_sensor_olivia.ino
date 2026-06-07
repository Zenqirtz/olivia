// ==========================================================================
// OLIVIA IoT - Monitor Kandang (Suhu, Kelembapan, Amonia)
// Terintegrasi dengan Backend Olivia API
//
// Library yang diperlukan (Install via Arduino IDE > Manage Libraries):
//   1. Adafruit SSD1306
//   2. Adafruit GFX Library
//   3. DHT sensor library (by Adafruit)
//   4. ArduinoJson (by Benoit Blanchon) -- WAJIB ditambahkan
//   5. WiFi (sudah bawaan ESP32)
//   6. HTTPClient (sudah bawaan ESP32)
// ==========================================================================

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include <WiFi.h>
#include <HTTPClient.h>   // << TAMBAHAN untuk HTTP POST

// ---- KONFIGURASI LAYAR OLED ----
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

// ---- KONFIGURASI SENSOR ----
#define DHTPIN 4
#define DHTTYPE DHT22
#define MQ135_PIN 34

// ---- KONFIGURASI WI-FI ----
const char* ssid     = "KOST PUTRA 3 DECO";
const char* password = "Kotamalang3";

// ====================================================================
// !!  GANTI IP INI dengan IP PC/Laptop tempat backend Express berjalan
//     Cara cek: buka CMD lalu ketik: ipconfig
//     Cari bagian "IPv4 Address" pada adapter WiFi Anda
//     Contoh hasil: 192.168.1.10 => isi jadi "192.168.1.10"
// ====================================================================
const char* serverIP   = "10.10.10.23";   // << GANTI dengan IP PC Anda
const int   serverPort = 5000;            // Port backend Express (default)
const int   DEVICE_ID  = 1;              // ID perangkat ESP32 ini

// ---- INTERVAL PENGIRIMAN DATA ----
// Data dikirim ke server setiap N loop (1 loop ≈ 2 detik)
// Contoh: SEND_INTERVAL = 5 artinya kirim setiap 10 detik (5 x 2 detik)
const int SEND_INTERVAL = 5;

// ---- DEFINISI PIN LED ----
const int pinLedMerah = 12;
const int pinLedHijau = 14;

// ---- KONSTANTA KALIBRASI AMONIA (MQ135) ----
const float RL = 10.0;
float Ro = 40.0;

// ---- OBJEK SENSOR & LAYAR ----
DHT dht(DHTPIN, DHTTYPE);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ---- VARIABEL PENGHITUNG LOOP ----
int loopCounter = 0;

// ==========================================================================
// FUNGSI: Hubungkan WiFi
// ==========================================================================
void hubungkanWiFi() {
  Serial.print("[Wi-Fi] Menghubungkan ke: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  int counter = 0;
  while (WiFi.status() != WL_CONNECTED && counter < 20) {
    delay(500);
    Serial.print(".");
    counter++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Terhubung!");
    Serial.print("[Wi-Fi] IP ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[Wi-Fi] Gagal terhubung. Cek SSID/Password.");
  }
}

// ==========================================================================
// FUNGSI: Kalibrasi Sensor MQ135 di Udara Kamar
// ==========================================================================
void kalibrasiSensorOtomatis() {
  Serial.println("[Kalibrasi] Memulai pembacaan udara dasar...");
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Kalibrasi Sensor...");
  display.println("Mohon Tunggu 5 Detik");
  display.display();

  float totalRs = 0;

  for (int i = 0; i < 10; i++) {
    int adcMentah = analogRead(MQ135_PIN);
    float vOut = ((float)adcMentah / 4095.0) * 3.3;
    if (vOut < 0.1) vOut = 0.1;

    float RsSaatIni = ((3.3 - vOut) / vOut) * RL;
    totalRs += RsSaatIni;
    delay(500);
  }

  float rataRataRs = totalRs / 10.0;
  Ro = rataRataRs / 3.6;

  if (Ro < 1.0) Ro = 35.0;

  Serial.print("[Kalibrasi Selesai] Nilai Ro: ");
  Serial.println(Ro);
}

// ==========================================================================
// FUNGSI: Kirim Data Sensor ke Backend Olivia API
//   Endpoint : POST http://<serverIP>:5000/api/sensors/readings
//   Payload  : { "device_id": 1, "temperature": x, "humidity": x, "ammonia": x }
// ==========================================================================
void kirimKeServer(float suhu, float kelembapan, float amonia) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Tidak ada koneksi WiFi. Skip pengiriman.");
    return;
  }

  HTTPClient http;

  // Bangun URL endpoint
  String url = "http://";
  url += serverIP;
  url += ":";
  url += serverPort;
  url += "/api/sensors/readings";

  Serial.print("[HTTP] Mengirim ke: ");
  Serial.println(url);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000); // Timeout 5 detik

  // Buat JSON payload secara manual tanpa library ArduinoJson
  String jsonPayload = "{\"device_id\":" + String(DEVICE_ID) +
                       ",\"temperature\":" + String(suhu, 1) +
                       ",\"humidity\":" + String(kelembapan, 1) +
                       ",\"ammonia\":" + String(amonia, 1) + "}";

  Serial.print("[HTTP] Payload: ");
  Serial.println(jsonPayload);

  // Kirim HTTP POST
  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("[HTTP] Response Code: ");
    Serial.println(httpCode);
    Serial.print("[HTTP] Response: ");
    Serial.println(response);

    // Tampilkan status kirim di OLED sesaat
    display.fillRect(0, 56, 128, 8, BLACK); // Bersihkan baris bawah
    display.setCursor(0, 56);
    if (httpCode == 201) {
      display.print("Data Terkirim OK!");
    } else {
      display.print("Server Error: " + String(httpCode));
    }
    display.display();
  } else {
    Serial.print("[HTTP] Gagal mengirim! Error: ");
    Serial.println(http.errorToString(httpCode).c_str());

    // Tampilkan error di OLED
    display.fillRect(0, 56, 128, 8, BLACK);
    display.setCursor(0, 56);
    display.print("Gagal Kirim!");
    display.display();
  }

  http.end();
}

// ==========================================================================
// SETUP
// ==========================================================================
void setup() {
  Serial.begin(115200);
  dht.begin();

  pinMode(pinLedMerah, OUTPUT);
  pinMode(pinLedHijau, OUTPUT);
  digitalWrite(pinLedMerah, LOW);
  digitalWrite(pinLedHijau, LOW);

  analogSetAttenuation(ADC_11db);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED tidak ditemukan!");
    while (true);
  }

  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(1);

  // Kalibrasi sensor sebelum mulai
  kalibrasiSensorOtomatis();

  // Sambungkan WiFi
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Menghubungkan WiFi...");
  display.display();
  hubungkanWiFi();

  // Tampilkan IP ESP32 setelah konek
  if (WiFi.status() == WL_CONNECTED) {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("WiFi Terhubung!");
    display.setCursor(0, 16);
    display.print("IP: ");
    display.println(WiFi.localIP());
    display.setCursor(0, 32);
    display.print("Server: ");
    display.print(serverIP);
    display.print(":");
    display.println(serverPort);
    display.display();
    delay(3000);
  }
}

// ==========================================================================
// LOOP UTAMA
// ==========================================================================
void loop() {
  // Auto-reconnect WiFi jika putus
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Wi-Fi] Koneksi terputus. Mencoba ulang...");
    WiFi.begin(ssid, password);
    delay(2000);
  }

  // Baca sensor DHT22
  float suhu       = dht.readTemperature();
  float kelembapan = dht.readHumidity();

  // Baca sensor MQ135
  int gasRaw = analogRead(MQ135_PIN);

  if (isnan(suhu) || isnan(kelembapan)) {
    Serial.println("[DHT] Gagal membaca sensor DHT22!");
    delay(2000);
    return;
  }

  // Konversi ADC ke PPM Amonia
  float vOut = ((float)gasRaw / 4095.0) * 3.3;
  if (vOut < 0.1) vOut = 0.1;
  if (vOut > 3.2) vOut = 3.2;

  float Rs        = ((3.3 - vOut) / vOut) * RL;
  float rasio     = Rs / Ro;
  float ppmAmonia = 102.2 * pow(rasio, -2.473);

  if (ppmAmonia < 1.0)   ppmAmonia = 3.2;
  if (ppmAmonia > 999.0) ppmAmonia = 999.0;

  // ---- Logika LED Indikator (batas aman: 20 PPM atau suhu > 35°C) ----
  bool statusBahaya = (ppmAmonia > 20.0 || suhu > 35.0);
  if (statusBahaya) {
    digitalWrite(pinLedMerah, HIGH);
    digitalWrite(pinLedHijau, LOW);
  } else {
    digitalWrite(pinLedMerah, LOW);
    digitalWrite(pinLedHijau, HIGH);
  }

  // ---- Output Serial Monitor ----
  Serial.println("========================");
  Serial.print("Suhu       : ");  Serial.print(suhu, 1);        Serial.println(" C");
  Serial.print("Kelembapan : ");  Serial.print(kelembapan, 1);  Serial.println(" %");
  Serial.print("Raw ADC    : ");  Serial.println(gasRaw);
  Serial.print("Amonia     : ");  Serial.print(ppmAmonia, 1);   Serial.println(" PPM");
  Serial.print("Loop #     : ");  Serial.print(loopCounter);
  Serial.print(" / Kirim tiap: "); Serial.println(SEND_INTERVAL);
  Serial.print("STATUS     : ");
  Serial.println(statusBahaya ? "[BAHAYA - LED MERAH]" : "[AMAN - LED HIJAU]");

  // ---- Tampilan OLED ----
  display.clearDisplay();

  // Baris 1: Header + status WiFi
  display.setCursor(0, 0);
  display.print("Olivia Monitor ");
  display.println((WiFi.status() == WL_CONNECTED) ? "[OK]" : "[OFF]");

  // Baris 2: Suhu
  display.setCursor(0, 16);
  display.print("Suhu : ");
  display.print(suhu, 1);
  display.println(" C");

  // Baris 3: Kelembapan
  display.setCursor(0, 30);
  display.print("Hum  : ");
  display.print(kelembapan, 1);
  display.println(" %");

  // Baris 4: Amonia
  display.setCursor(0, 44);
  display.print("NH3  : ");
  display.print((int)ppmAmonia);
  display.print(" PPM");
  if (statusBahaya) {
    display.print(" [!]"); // Indikator bahaya di layar
  }

  display.display();

  // ---- Kirim ke Backend Setiap SEND_INTERVAL loop ----
  loopCounter++;
  if (loopCounter >= SEND_INTERVAL) {
    loopCounter = 0;
    kirimKeServer(suhu, kelembapan, ppmAmonia);
  }

  delay(2000); // 1 loop = 2 detik
}
