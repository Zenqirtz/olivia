import time
import random
import math
import json
import urllib.request
import threading
from datetime import datetime

# ==============================================================================
# CONFIGURATION
# ==============================================================================
SENSOR_API_URL = "http://localhost:5000/api/sensors/readings"
EGG_API_URL = "http://localhost:5000/api/eggs"
DEVICE_ID = 1

# Interval terpisah untuk dua sistem yang berbeda
SENSOR_INTERVAL_SECONDS = 5     # Jeda pengiriman data sensor kandang (dalam detik)
EGG_SCAN_INTERVAL_SECONDS = 8   # Jeda pengiriman data klasifikasi telur (dalam detik)

EGG_SCAN_PROBABILITY = 0.70     # Probabilitas telur melewati sensor scan (70%)

# ANSI escape codes untuk pewarnaan terminal
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"
COLOR_CYAN = "\033[36m"
COLOR_GREEN = "\033[32m"
COLOR_YELLOW = "\033[33m"
COLOR_RED = "\033[31m"
COLOR_MAGENTA = "\033[35m"
COLOR_BLUE = "\033[34m"
COLOR_WHITE = "\033[37m"
COLOR_DIM = "\033[2m"

# Lock untuk print agar output dari 2 thread tidak bertabrakan
print_lock = threading.Lock()

def safe_print(*args, **kwargs):
    """Thread-safe print function."""
    with print_lock:
        print(*args, **kwargs)

# ==============================================================================
# BANNER
# ==============================================================================
print(f"{COLOR_BOLD}{COLOR_MAGENTA}╔══════════════════════════════════════════════════════════════╗{COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}║     EGGSPIRA - SIMULATOR IoT & KLASIFIKASI TELUR           ║{COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}╠══════════════════════════════════════════════════════════════╣{COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}║  Sistem ini terdiri dari 2 modul TERPISAH:                 ║{COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}║                                                            ║{COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}║  📡 MODUL 1: Pemantauan Sensor Kandang                     ║{COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}║     → Suhu, Kelembapan, Gas Amonia                         ║{COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}║     → Hanya untuk monitoring kondisi kandang                ║{COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}║     → TIDAK berkaitan dengan hasil klasifikasi telur       ║{COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}║                                                            ║{COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}║  🥚 MODUL 2: Klasifikasi Cangkang Telur                    ║{COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}║     → Klasifikasi berdasarkan kondisi cangkang telur       ║{COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}║     → Hasil: BAIK (cangkang utuh) atau BURUK (retak/cacat) ║{COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}║     → Berjalan INDEPENDEN dari sensor kandang              ║{COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}╚══════════════════════════════════════════════════════════════╝{COLOR_RESET}")
print()
print(f"  {COLOR_BOLD}Konfigurasi:{COLOR_RESET}")
print(f"  ├─ API Sensor       : {COLOR_CYAN}{SENSOR_API_URL}{COLOR_RESET}")
print(f"  ├─ API Klasifikasi  : {COLOR_CYAN}{EGG_API_URL}{COLOR_RESET}")
print(f"  ├─ Device ID        : {COLOR_CYAN}{DEVICE_ID}{COLOR_RESET}")
print(f"  ├─ Interval Sensor  : {COLOR_CYAN}{SENSOR_INTERVAL_SECONDS} detik{COLOR_RESET}")
print(f"  ├─ Interval Scan    : {COLOR_CYAN}{EGG_SCAN_INTERVAL_SECONDS} detik{COLOR_RESET}")
print(f"  └─ Scan Probability : {COLOR_CYAN}{int(EGG_SCAN_PROBABILITY * 100)}%{COLOR_RESET}")
print()
print(f"  {COLOR_GREEN}▶ Berjalan... (Tekan Ctrl+C untuk berhenti){COLOR_RESET}")
print(f"{COLOR_BOLD}{COLOR_MAGENTA}{'─' * 62}{COLOR_RESET}\n")


# ==============================================================================
# MODUL 1: PEMANTAUAN SENSOR KANDANG
# ==============================================================================
# Fungsi ini HANYA bertugas memantau kondisi lingkungan kandang.
# Data suhu, kelembapan, dan gas amonia TIDAK mempengaruhi hasil 
# klasifikasi telur. Ini murni untuk monitoring kondisi kandang.
# ==============================================================================

def run_sensor_monitoring():
    """
    Thread terpisah untuk pemantauan sensor kandang.
    Mengukur: Suhu, Kelembapan, Gas Amonia.
    Tujuan: Monitoring kondisi lingkungan kandang saja.
    TIDAK ada hubungannya dengan klasifikasi kualitas telur.
    """
    ammonia_state = 12.0
    step = 0

    while not stop_event.is_set():
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # --- Simulasi data sensor ---
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
            if random.random() < 0.10:
                ammonia_state = random.uniform(20.5, 24.5)
            else:
                ammonia_change = random.uniform(-0.8, 0.8)
                ammonia_state += ammonia_change
            ammonia_state = max(5.0, min(25.0, ammonia_state))
            ammonia = round(ammonia_state, 2)

            # Payload sensor (murni data lingkungan kandang)
            sensor_payload = {
                "device_id": DEVICE_ID,
                "temperature": temperature,
                "humidity": humidity,
                "ammonia": ammonia
            }

            # Kirim data sensor ke API
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

                    safe_print(f"\n{COLOR_BOLD}{COLOR_BLUE}┌──────────────────────────────────────────────────────┐{COLOR_RESET}")
                    safe_print(f"{COLOR_BOLD}{COLOR_BLUE}│  📡 MODUL 1: PEMANTAUAN SENSOR KANDANG  #{step + 1:<10} │{COLOR_RESET}")
                    safe_print(f"{COLOR_BOLD}{COLOR_BLUE}│  {COLOR_DIM}{timestamp}{COLOR_RESET}{COLOR_BOLD}{COLOR_BLUE}                                    │{COLOR_RESET}")
                    safe_print(f"{COLOR_BOLD}{COLOR_BLUE}├──────────────────────────────────────────────────────┤{COLOR_RESET}")
                    safe_print(f"{COLOR_BOLD}{COLOR_BLUE}│{COLOR_RESET}  Status     : {COLOR_GREEN}✓ TERKIRIM{COLOR_RESET}")
                    safe_print(f"{COLOR_BOLD}{COLOR_BLUE}│{COLOR_RESET}  Suhu       : {COLOR_YELLOW}{temperature} °C{COLOR_RESET}")
                    safe_print(f"{COLOR_BOLD}{COLOR_BLUE}│{COLOR_RESET}  Kelembapan : {COLOR_CYAN}{humidity} %{COLOR_RESET}")
                    safe_print(f"{COLOR_BOLD}{COLOR_BLUE}│{COLOR_RESET}  Gas Amonia : {ammonia_color}{ammonia} ppm{COLOR_RESET}")
                    safe_print(f"{COLOR_BOLD}{COLOR_BLUE}│{COLOR_RESET}  {COLOR_DIM}(Data ini hanya untuk monitoring kandang){COLOR_RESET}")
                    safe_print(f"{COLOR_BOLD}{COLOR_BLUE}└──────────────────────────────────────────────────────┘{COLOR_RESET}")
            except urllib.error.URLError as e:
                safe_print(f"\n{COLOR_BOLD}{COLOR_BLUE}📡 SENSOR KANDANG #{step + 1}:{COLOR_RESET} {COLOR_RED}GAGAL{COLOR_RESET} ({e.reason})")

            step += 1
            # Tunggu sesuai interval sensor
            for _ in range(SENSOR_INTERVAL_SECONDS * 10):
                if stop_event.is_set():
                    return
                time.sleep(0.1)

        except Exception as e:
            safe_print(f"{COLOR_RED}[SENSOR ERROR] {e}{COLOR_RESET}")
            time.sleep(1)


# ==============================================================================
# MODUL 2: KLASIFIKASI CANGKANG TELUR
# ==============================================================================
# Fungsi ini HANYA bertugas mengklasifikasi kondisi cangkang telur.
# Klasifikasi berdasarkan visual cangkang telur:
#   - BAIK  : Cangkang utuh, tidak ada retakan, permukaan halus
#   - BURUK : Cangkang retak, pecah, kotor, atau cacat
# 
# Sistem ini TIDAK berhubungan dengan data sensor kandang.
# ==============================================================================

# Daftar deskripsi kondisi cangkang untuk simulasi yang lebih realistis
SHELL_DESCRIPTIONS_GOOD = [
    "Cangkang utuh, permukaan halus",
    "Cangkang sempurna, tidak ada retakan",
    "Permukaan cangkang bersih dan utuh",
    "Cangkang kuat, bentuk normal",
    "Cangkang mulus tanpa cacat",
    "Tekstur cangkang baik, warna merata",
]

SHELL_DESCRIPTIONS_BAD = [
    "Cangkang retak halus terdeteksi",
    "Terdapat retakan pada bagian samping",
    "Cangkang pecah sebagian",
    "Permukaan cangkang kasar dan tidak rata",
    "Cangkang tipis dan rapuh",
    "Terdapat noda/kotoran pada cangkang",
    "Bentuk cangkang abnormal",
    "Cangkang berlubang kecil",
]

def run_egg_classification():
    """
    Thread terpisah untuk klasifikasi cangkang telur.
    Klasifikasi berdasarkan: Kondisi cangkang telur (baik/buruk).
    TIDAK ada hubungannya dengan data sensor kandang (suhu/kelembapan/amonia).
    """
    step = 0

    while not stop_event.is_set():
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # Apakah ada telur yang melewati scanner?
            if random.random() < EGG_SCAN_PROBABILITY:
                
                # ==============================================================
                # KLASIFIKASI BERDASARKAN CANGKANG TELUR
                # Kriteria penilaian:
                #   - Kondisi fisik cangkang (utuh/retak/pecah)
                #   - Tekstur permukaan cangkang (halus/kasar)
                #   - Kebersihan cangkang (bersih/kotor)
                #   - Bentuk cangkang (normal/abnormal)
                # ==============================================================
                
                quality_roll = random.random()
                
                if quality_roll < 0.78:
                    # CANGKANG BAIK - utuh, tidak retak, bersih
                    quality = "good"
                    shell_condition = "baik"
                    confidence = round(random.uniform(0.88, 0.99), 4)
                    shell_description = random.choice(SHELL_DESCRIPTIONS_GOOD)
                    
                    # Telur dengan cangkang baik - dimensi normal
                    weight = round(random.uniform(55.0, 65.0), 2)
                    # Ketebalan cangkang baik: 0.33 - 0.40 mm
                    shell_thickness = round(random.uniform(0.33, 0.40), 3)
                    
                elif quality_roll < 0.95:
                    # CANGKANG BURUK - retak, pecah, kotor, atau cacat
                    quality = "bad"
                    shell_condition = "buruk"
                    confidence = round(random.uniform(0.80, 0.97), 4)
                    shell_description = random.choice(SHELL_DESCRIPTIONS_BAD)
                    
                    # Telur dengan cangkang buruk
                    weight = round(random.uniform(45.0, 60.0), 2)
                    # Ketebalan cangkang buruk: 0.20 - 0.32 mm (lebih tipis)
                    shell_thickness = round(random.uniform(0.20, 0.32), 3)
                    
                else:
                    # TIDAK DAPAT DITENTUKAN - cangkang ambigu
                    quality = "uncertain"
                    shell_condition = "tidak pasti"
                    confidence = round(random.uniform(0.55, 0.75), 4)
                    shell_description = "Kondisi cangkang sulit ditentukan"
                    
                    weight = round(random.uniform(50.0, 58.0), 2)
                    shell_thickness = round(random.uniform(0.28, 0.35), 3)

                quality_score = round(confidence * 100, 2)

                # Dimensi telur
                length = round(random.uniform(5.2, 6.1), 2)
                width = round(random.uniform(4.0, 4.5), 2)
                height = round(random.uniform(3.9, 4.3), 2)

                # Payload klasifikasi telur (berdasarkan cangkang)
                egg_payload = {
                    "quality": quality,
                    "ai_confidence": confidence,
                    "quality_score": quality_score,
                    "weight": weight,
                    "length": length,
                    "width": width,
                    "height": height
                }

                # Kirim data klasifikasi telur ke API
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

                        # Warna berdasarkan kondisi cangkang
                        if quality == "good":
                            quality_color = COLOR_GREEN
                            shell_icon = "✅"
                        elif quality == "bad":
                            quality_color = COLOR_RED
                            shell_icon = "❌"
                        else:
                            quality_color = COLOR_YELLOW
                            shell_icon = "⚠️"

                        safe_print(f"\n{COLOR_BOLD}{COLOR_MAGENTA}┌──────────────────────────────────────────────────────┐{COLOR_RESET}")
                        safe_print(f"{COLOR_BOLD}{COLOR_MAGENTA}│  🥚 MODUL 2: KLASIFIKASI CANGKANG TELUR  #{step + 1:<8} │{COLOR_RESET}")
                        safe_print(f"{COLOR_BOLD}{COLOR_MAGENTA}│  {COLOR_DIM}{timestamp}{COLOR_RESET}{COLOR_BOLD}{COLOR_MAGENTA}                                    │{COLOR_RESET}")
                        safe_print(f"{COLOR_BOLD}{COLOR_MAGENTA}├──────────────────────────────────────────────────────┤{COLOR_RESET}")
                        safe_print(f"{COLOR_BOLD}{COLOR_MAGENTA}│{COLOR_RESET}  Status       : {COLOR_GREEN}✓ TERKIRIM{COLOR_RESET}")
                        safe_print(f"{COLOR_BOLD}{COLOR_MAGENTA}│{COLOR_RESET}  Egg Code     : {COLOR_CYAN}{egg_code}{COLOR_RESET}")
                        safe_print(f"{COLOR_BOLD}{COLOR_MAGENTA}│{COLOR_RESET}  {shell_icon} Cangkang   : {quality_color}{shell_condition.upper()}{COLOR_RESET} (Confidence: {quality_score}%)")
                        safe_print(f"{COLOR_BOLD}{COLOR_MAGENTA}│{COLOR_RESET}  Deskripsi    : {COLOR_DIM}{shell_description}{COLOR_RESET}")
                        safe_print(f"{COLOR_BOLD}{COLOR_MAGENTA}│{COLOR_RESET}  Ketebalan    : {shell_thickness} mm")
                        safe_print(f"{COLOR_BOLD}{COLOR_MAGENTA}│{COLOR_RESET}  Berat        : {weight} gram")
                        safe_print(f"{COLOR_BOLD}{COLOR_MAGENTA}│{COLOR_RESET}  Dimensi      : {length} x {width} x {height} cm")
                        safe_print(f"{COLOR_BOLD}{COLOR_MAGENTA}│{COLOR_RESET}  {COLOR_DIM}(Klasifikasi berdasarkan kondisi cangkang telur){COLOR_RESET}")
                        safe_print(f"{COLOR_BOLD}{COLOR_MAGENTA}└──────────────────────────────────────────────────────┘{COLOR_RESET}")
                except urllib.error.URLError as e:
                    safe_print(f"\n{COLOR_BOLD}{COLOR_MAGENTA}🥚 KLASIFIKASI TELUR #{step + 1}:{COLOR_RESET} {COLOR_RED}GAGAL{COLOR_RESET} ({e.reason})")
            else:
                safe_print(f"\n{COLOR_BOLD}{COLOR_MAGENTA}🥚 KLASIFIKASI TELUR #{step + 1}:{COLOR_RESET} {COLOR_YELLOW}TIDAK ADA TELUR LEWAT SCANNER{COLOR_RESET}")

            step += 1
            # Tunggu sesuai interval klasifikasi telur
            for _ in range(EGG_SCAN_INTERVAL_SECONDS * 10):
                if stop_event.is_set():
                    return
                time.sleep(0.1)

        except Exception as e:
            safe_print(f"{COLOR_RED}[EGG CLASSIFICATION ERROR] {e}{COLOR_RESET}")
            time.sleep(1)


# ==============================================================================
# MAIN: Jalankan kedua modul secara TERPISAH menggunakan thread
# ==============================================================================
stop_event = threading.Event()

try:
    # Thread 1: Pemantauan Sensor Kandang (suhu, kelembapan, amonia)
    sensor_thread = threading.Thread(
        target=run_sensor_monitoring,
        name="SensorMonitoring",
        daemon=True
    )

    # Thread 2: Klasifikasi Cangkang Telur (baik/buruk)
    egg_thread = threading.Thread(
        target=run_egg_classification,
        name="EggClassification",
        daemon=True
    )

    safe_print(f"{COLOR_BOLD}{COLOR_GREEN}▶ Memulai Modul 1: Pemantauan Sensor Kandang...{COLOR_RESET}")
    sensor_thread.start()

    time.sleep(1)  # Sedikit jeda agar output tidak bertumpuk saat awal

    safe_print(f"{COLOR_BOLD}{COLOR_GREEN}▶ Memulai Modul 2: Klasifikasi Cangkang Telur...{COLOR_RESET}")
    egg_thread.start()

    # Tunggu sampai user tekan Ctrl+C
    while sensor_thread.is_alive() or egg_thread.is_alive():
        time.sleep(0.5)

except KeyboardInterrupt:
    safe_print(f"\n{COLOR_BOLD}{COLOR_YELLOW}{'─' * 62}{COLOR_RESET}")
    safe_print(f"{COLOR_BOLD}{COLOR_YELLOW}  Simulator dihentikan oleh pengguna.{COLOR_RESET}")
    safe_print(f"{COLOR_BOLD}{COLOR_YELLOW}  Menghentikan kedua modul...{COLOR_RESET}")
    stop_event.set()
    time.sleep(1)
    safe_print(f"{COLOR_BOLD}{COLOR_GREEN}  ✓ Semua modul berhasil dihentikan. Sampai jumpa!{COLOR_RESET}")
    safe_print(f"{COLOR_BOLD}{COLOR_YELLOW}{'─' * 62}{COLOR_RESET}")
