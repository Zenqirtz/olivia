import time
import random
import math
import json
import urllib.request
from datetime import datetime

# ==============================================================================
# CONFIGURATION
# ==============================================================================
SENSOR_API_URL = "http://localhost:5000/api/sensors/readings"
EGG_API_URL = "http://localhost:5000/api/eggs"
DEVICE_ID = 1
INTERVAL_SECONDS = 5  # Jeda pengiriman data simulator (dalam detik)
EGG_SCAN_PROBABILITY = 0.70  # Probabilitas telur melewati sensor scan (70%)

# ANSI escape codes untuk pewarnaan terminal agar visual lebih menarik
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"
COLOR_CYAN = "\033[36m"
COLOR_GREEN = "\033[32m"
COLOR_YELLOW = "\033[33m"
COLOR_RED = "\033[31m"
COLOR_MAGENTA = "\033[35m"
COLOR_BLUE = "\033[34m"

print(f"{COLOR_BOLD}{COLOR_MAGENTA}=================================================={COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}   EGGSPIRA - SIMULATOR SENSOR IoT & SCAN TELUR   {COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}=================================================={COLOR_RESET}")
print(f"API Sensor       : {COLOR_CYAN}{SENSOR_API_URL}{COLOR_RESET}")
print(f"API Scan Telur   : {COLOR_CYAN}{EGG_API_URL}{COLOR_RESET}")
print(f"Device ID        : {COLOR_CYAN}{DEVICE_ID}{COLOR_RESET}")
print(f"Interval         : {COLOR_CYAN}{INTERVAL_SECONDS} detik{COLOR_RESET}")
print(f"Scan Probability : {COLOR_CYAN}{int(EGG_SCAN_PROBABILITY * 100)}%{COLOR_RESET}")
print(f"Status           : {COLOR_GREEN}Berjalan... (Tekan Ctrl+C untuk berhenti){COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}--------------------------------------------------{COLOR_RESET}\n")

# State awal untuk random walk amonia
ammonia_state = 12.0

# Mulai simulasi
step = 0
try:
    while True:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"{COLOR_BOLD}{COLOR_MAGENTA}--- STEP #{step + 1} ({timestamp}) ---{COLOR_RESET}")

        # ==========================================
        # 1. SIMULASI DATA SENSOR KANDANG (IoT)
        # ==========================================
        time_factor = (step % 100) / 100.0 * 2 * math.pi
        
        # Suhu berkisar antara 26°C sampai 32°C
        temp_base = 29.0
        temp_wave = math.sin(time_factor) * 3.0
        temp_noise = random.uniform(-0.3, 0.3)
        temperature = round(temp_base + temp_wave + temp_noise, 2)
        
        # Kelembapan berkisar antara 55% sampai 75%
        humidity_base = 65.0
        humidity_wave = -math.sin(time_factor) * 10.0
        humidity_noise = random.uniform(-1.0, 1.0)
        humidity = round(humidity_base + humidity_wave + humidity_noise, 2)
        
        # Amonia berkisar antara 5 - 25 ppm (random walk)
        ammonia_change = random.uniform(-0.8, 0.8)
        ammonia_state += ammonia_change
        ammonia_state = max(5.0, min(25.0, ammonia_state))
        ammonia = round(ammonia_state, 2)

        # Payload sensor
        sensor_payload = {
            "device_id": DEVICE_ID,
            "temperature": temperature,
            "humidity": humidity,
            "ammonia": ammonia
        }

        # Kirim data sensor
        sensor_req_data = json.dumps(sensor_payload).encode('utf-8')
        sensor_req = urllib.request.Request(
            SENSOR_API_URL, 
            data=sensor_req_data, 
            headers={'Content-Type': 'application/json'}
        )

        try:
            with urllib.request.urlopen(sensor_req) as response:
                res_body = json.loads(response.read().decode('utf-8'))
                ammonia_color = COLOR_RED if ammonia > 20.0 else (COLOR_YELLOW if ammonia > 15.0 else COLOR_GREEN)
                print(f"📡 {COLOR_BOLD}Kirim Data Sensor Kandang:{COLOR_RESET} {COLOR_GREEN}SUKSES{COLOR_RESET}")
                print(f"  ├─ Suhu       : {COLOR_YELLOW}{temperature} °C{COLOR_RESET}")
                print(f"  ├─ Kelembapan : {COLOR_CYAN}{humidity} %{COLOR_RESET}")
                print(f"  └─ Gas Amonia : {ammonia_color}{ammonia} ppm{COLOR_RESET}")
        except urllib.error.URLError as e:
            print(f"📡 {COLOR_BOLD}Kirim Data Sensor Kandang:{COLOR_RESET} {COLOR_RED}GAGAL{COLOR_RESET} ({e.reason})")

        # ==========================================
        # 2. SIMULASI SCANNING TELUR (PRODUKSI)
        # ==========================================
        # Mensimulasikan telur melewati kamera scanner dengan probabilitas EGG_SCAN_PROBABILITY
        if random.random() < EGG_SCAN_PROBABILITY:
            # Tentukan kualitas: 80% good, 15% bad, 5% uncertain
            quality_roll = random.random()
            if quality_roll < 0.80:
                quality = "good"
                confidence = round(random.uniform(0.90, 0.99), 4)
                weight = round(random.uniform(55.0, 65.0), 2)  # Telur bagus biasanya berat normal
            elif quality_roll < 0.95:
                quality = "bad"
                confidence = round(random.uniform(0.80, 0.97), 4)
                weight = round(random.uniform(45.0, 53.0), 2)  # Telur rusak/kotor/kecil
            else:
                quality = "uncertain"
                confidence = round(random.uniform(0.60, 0.79), 4)
                weight = round(random.uniform(50.0, 58.0), 2)

            quality_score = round(confidence * 100, 2)
            
            # Dimensi telur acak (panjang x lebar x tinggi)
            length = round(random.uniform(5.2, 6.1), 2)
            width = round(random.uniform(4.0, 4.5), 2)
            height = round(random.uniform(3.9, 4.3), 2)

            # Payload telur
            egg_payload = {
                "quality": quality,
                "ai_confidence": confidence,
                "quality_score": quality_score,
                "weight": weight,
                "length": length,
                "width": width,
                "height": height
            }

            # Kirim data telur
            egg_req_data = json.dumps(egg_payload).encode('utf-8')
            egg_req = urllib.request.Request(
                EGG_API_URL, 
                data=egg_req_data, 
                headers={'Content-Type': 'application/json'}
            )

            try:
                with urllib.request.urlopen(egg_req) as response:
                    res_body = json.loads(response.read().decode('utf-8'))
                    egg_code = res_body.get("data", {}).get("egg_code", "EGG-UNKNOWN")
                    
                    quality_color = COLOR_GREEN if quality == "good" else (COLOR_RED if quality == "bad" else COLOR_YELLOW)
                    
                    print(f"🥚 {COLOR_BOLD}Kirim Hasil Scan Telur:{COLOR_RESET} {COLOR_GREEN}SUKSES{COLOR_RESET}")
                    print(f"  ├─ Egg Code   : {COLOR_CYAN}{egg_code}{COLOR_RESET}")
                    print(f"  ├─ Kualitas   : {quality_color}{quality.upper()}{COLOR_RESET} (Confidence: {quality_score}%)")
                    print(f"  └─ Fisik      : {weight} gram | {length}x{width}x{height} cm")
            except urllib.error.URLError as e:
                print(f"🥚 {COLOR_BOLD}Kirim Hasil Scan Telur:{COLOR_RESET} {COLOR_RED}GAGAL{COLOR_RESET} ({e.reason})")
        else:
            print(f"🥚 {COLOR_BOLD}Kirim Hasil Scan Telur:{COLOR_RESET} {COLOR_YELLOW}TIDAK ADA TELUR LEWAT{COLOR_RESET}")

        print("")
        step += 1
        time.sleep(INTERVAL_SECONDS)

except KeyboardInterrupt:
    print(f"\n{COLOR_BOLD}{COLOR_YELLOW}Simulator dihentikan oleh pengguna. Sampai jumpa!{COLOR_RESET}")
