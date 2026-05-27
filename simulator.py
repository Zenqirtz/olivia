import time
import random
import math
import json
import urllib.request
from datetime import datetime

# ==============================================================================
# CONFIGURATION
# ==============================================================================
API_URL = "http://localhost:5000/api/sensors/readings"
DEVICE_ID = 1
INTERVAL_SECONDS = 5  # Jeda pengiriman data simulator (dalam detik)

# ANSI escape codes untuk pewarnaan terminal agar visual lebih menarik
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"
COLOR_CYAN = "\033[36m"
COLOR_GREEN = "\033[32m"
COLOR_YELLOW = "\033[33m"
COLOR_RED = "\033[31m"
COLOR_MAGENTA = "\033[35m"

print(f"{COLOR_BOLD}{COLOR_MAGENTA}=================================================={COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}       EGGSPIRA - SIMULATOR SENSOR IoT (ESP32)     {COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}=================================================={COLOR_RESET}")
print(f"Mengirim data ke : {COLOR_CYAN}{API_URL}{COLOR_RESET}")
print(f"Device ID        : {COLOR_CYAN}{DEVICE_ID}{COLOR_RESET}")
print(f"Interval         : {COLOR_CYAN}{INTERVAL_SECONDS} detik{COLOR_RESET}")
print(f"Status           : {COLOR_GREEN}Berjalan... (Tekan Ctrl+C untuk berhenti){COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}--------------------------------------------------{COLOR_RESET}\n")

# State awal untuk random walk amonia
ammonia_state = 12.0

# Mulai simulasi
step = 0
try:
    while True:
        # 1. Simulasi Fluktuasi Alami (Suhu & Kelembapan menggunakan fungsi sinus)
        # Menghasilkan siklus suhu harian berdasarkan step index
        time_factor = (step % 100) / 100.0 * 2 * math.pi
        
        # Suhu berkisar antara 26°C sampai 32°C
        temp_base = 29.0
        temp_wave = math.sin(time_factor) * 3.0
        temp_noise = random.uniform(-0.3, 0.3)
        temperature = round(temp_base + temp_wave + temp_noise, 2)
        
        # Kelembapan berkisar antara 55% sampai 75% (berkebalikan dengan suhu)
        humidity_base = 65.0
        humidity_wave = -math.sin(time_factor) * 10.0
        humidity_noise = random.uniform(-1.0, 1.0)
        humidity = round(humidity_base + humidity_wave + humidity_noise, 2)
        
        # 2. Simulasi Amonia (Menggunakan random walk agar fluktuasinya natural)
        # Amonia berada di kisaran aman 5 ppm - 25 ppm
        ammonia_change = random.uniform(-0.8, 0.8)
        ammonia_state += ammonia_change
        # Batasi nilai amonia tetap di range 5 - 25 ppm
        ammonia_state = max(5.0, min(25.0, ammonia_state))
        ammonia = round(ammonia_state, 2)

        # Buat data payload JSON
        payload = {
            "device_id": DEVICE_ID,
            "temperature": temperature,
            "humidity": humidity,
            "ammonia": ammonia
        }

        # Dapatkan timestamp lokal untuk print log
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Kirim data ke API menggunakan urllib (bawaan Python, tidak butuh install pip requests)
        req_data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            API_URL, 
            data=req_data, 
            headers={'Content-Type': 'application/json'}
        )

        try:
            with urllib.request.urlopen(req) as response:
                res_body = json.loads(response.read().decode('utf-8'))
                
                # Tentukan warna indikator amonia (merah jika > 20 ppm)
                ammonia_color = COLOR_RED if ammonia > 20.0 else (COLOR_YELLOW if ammonia > 15.0 else COLOR_GREEN)
                
                print(f"[{timestamp}] Send Status: {COLOR_GREEN}OK{COLOR_RESET}")
                print(f" ├─ Suhu        : {COLOR_YELLOW}{temperature} °C{COLOR_RESET}")
                print(f" ├─ Kelembapan  : {COLOR_CYAN}{humidity} %{COLOR_RESET}")
                print(f" └─ Gas Amonia  : {ammonia_color}{ammonia} ppm{COLOR_RESET}")
                print(f" Response       : {res_body.get('message', 'Sukses')}\n")
        except urllib.error.URLError as e:
            print(f"[{timestamp}] Send Status: {COLOR_RED}FAILED{COLOR_RESET}")
            print(f" └─ Error       : {COLOR_RED}{e.reason}{COLOR_RESET}")
            print(f"   {COLOR_YELLOW}Pastikan server backend di port 5000 sudah berjalan!{COLOR_RESET}\n")

        # Naikkan step index
        step += 1
        time.sleep(INTERVAL_SECONDS)

except KeyboardInterrupt:
    print(f"\n{COLOR_BOLD}{COLOR_YELLOW}Simulator dihentikan oleh pengguna. Sampai jumpa!{COLOR_RESET}")
