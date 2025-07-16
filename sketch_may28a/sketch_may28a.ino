#include <WiFi.h>
#include <Wire.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
#include <HTTPClient.h>

// === WiFi Configuration ===
const char* ssid = "MONICA 123";
const char* password = "11223344";

// === Server Manual IP ===
const String serverIP = "192.168.100.37";
const String serverPath = "/telur/simpan.php";

// === ESP32 Server for ESP32-CAM Communication ===
WiFiServer server(8080);
WiFiClient client;

// === LCD Setup ===
LiquidCrystal_I2C lcd(0x27, 16, 2);

// === Servo Setup ===
Servo servoTelur;
const int pinServo = 5; // GPIO5

// === Ultrasonic Sensor Pins ===
const int trigPin1 = 27; // Sensor jelek
const int echoPin1 = 26;
const int trigPin2 = 33; // Sensor bagus
const int echoPin2 = 32;

long readDistanceCM(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 30000);
  return duration * 0.034 / 2;
}

void kirimKeDatabase(const String& jenisTelur) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi tidak terhubung.");
    return;
  }

  HTTPClient http;
  String url = "http://" + serverIP + serverPath;

  http.begin(url);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  String data ="egg_scans=" + jenisTelur;
  int httpResponseCode = http.POST(data);

  Serial.print("Mengirim ke DB: ");
  Serial.println(url);
  Serial.print("Jenis: ");
  Serial.println(jenisTelur);
  Serial.print("Response code: ");
  Serial.println(httpResponseCode);

  if (httpResponseCode > 0) {
    Serial.println("Respon: " + http.getString());
  } else {
    Serial.println("Gagal kirim data.");
  }

  http.end();
}

void setup() {
  Serial.begin(115200);

  // LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");

  // WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("IP:");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
  delay(2000);

  // Start TCP Server
  server.begin();

  // Servo
  servoTelur.attach(pinServo);
  servoTelur.write(0); // posisi awal

  // Sensor
  pinMode(trigPin1, OUTPUT);
  pinMode(echoPin1, INPUT);
  pinMode(trigPin2, OUTPUT);
  pinMode(echoPin2, INPUT);

  lcd.clear();
  lcd.print("Sistem aktif");
}

void loop() {
  // === ESP32-CAM Communication ===
  client = server.available();
  if (client) {
    Serial.println("ESP32-CAM terhubung.");
    String incomingData = "";

    while (client.connected()) {
      while (client.available()) {
        char c = client.read();
        incomingData += c;
      }

      if (incomingData.length() > 0) {
        incomingData.trim();
        Serial.print("Prediksi CAM: ");
        Serial.println(incomingData);

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Prediksi: ");
        lcd.setCursor(0, 1);
        lcd.print(incomingData);

        if (incomingData == "jelek") {
          servoTelur.write(20);
          delay(4000);
          servoTelur.write(90);
        } else if (incomingData == "bagus") {
          servoTelur.write(90);
        } 
        client.stop();
        Serial.println ("koneksi terputus");

        
      }
    }
  }

  // === Sensor Jelek (Sensor 1) ===
  long jarak1 = readDistanceCM(trigPin1, echoPin1);
  if (jarak1 > 0 && jarak1 < 5) {
    Serial.println("Telur JELEK terdeteksi.");
    kirimKeDatabase("bad");
    delay(1000);
  }

  // === Sensor Bagus (Sensor 2) ===
  long jarak2 = readDistanceCM(trigPin2, echoPin2);
  if (jarak2 > 0 && jarak2 < 5) {
    Serial.println("Telur BAGUS terdeteksi.");
    kirimKeDatabase("good");
    delay(1000);
  }

  delay(200); // minimal delay
}
