/**
 * Seed script for "olivia" database
 * Membuat tabel dan data awal dengan password hash yang valid
 * Jalankan: node seed-olivia.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'olivia',
    multipleStatements: true,
  });

  console.log('🔌 Connected to database:', process.env.DB_NAME || 'olivia');

  // ============================================
  // 1. CREATE TABLES
  // ============================================
  console.log('📦 Creating tables...');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id int NOT NULL AUTO_INCREMENT,
      name varchar(255) NOT NULL,
      email varchar(255) NOT NULL,
      password_hash varchar(255) NOT NULL,
      role enum('admin','superadmin') NOT NULL DEFAULT 'admin',
      phone varchar(20) DEFAULT NULL,
      bio text,
      avatar_url varchar(500) DEFAULT NULL,
      email_verified_at timestamp NULL DEFAULT NULL,
      is_active tinyint(1) NOT NULL DEFAULT 1,
      created_by int DEFAULT NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      UNIQUE KEY users_email_unique (email),
      KEY idx_users_role (role),
      KEY idx_users_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS egg_scans (
      scan_id int NOT NULL AUTO_INCREMENT,
      egg_code varchar(50) NOT NULL,
      quality enum('good','bad','uncertain') NOT NULL,
      ai_confidence decimal(5,4) DEFAULT NULL,
      quality_score decimal(5,2) DEFAULT NULL,
      image varchar(500) DEFAULT NULL,
      weight decimal(6,2) DEFAULT NULL,
      length decimal(5,2) DEFAULT NULL,
      width decimal(5,2) DEFAULT NULL,
      height decimal(5,2) DEFAULT NULL,
      scanned_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (scan_id),
      UNIQUE KEY egg_scans_egg_code_unique (egg_code),
      KEY idx_egg_scans_quality (quality),
      KEY idx_egg_scans_scanned_at (scanned_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS reports (
      report_id int NOT NULL AUTO_INCREMENT,
      user_id int NOT NULL,
      report_name varchar(255) NOT NULL,
      report_type enum('kualitas-telur','statistik-produksi','riwayat-aktivitas') NOT NULL,
      parameters json DEFAULT NULL,
      file_format enum('pdf','excel','csv') NOT NULL,
      file_path varchar(500) NOT NULL,
      file_size bigint DEFAULT NULL,
      generated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at timestamp NULL DEFAULT NULL,
      download_count int NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (report_id),
      KEY idx_reports_user_id (user_id),
      KEY idx_reports_type (report_type),
      KEY idx_reports_generated_at (generated_at),
      CONSTRAINT fk_reports_user_id FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS esp32_devices (
      device_id int NOT NULL AUTO_INCREMENT,
      device_name varchar(255) NOT NULL,
      device_type enum('esp32_cam_ai_scanner','esp32_devkit_controller') NOT NULL,
      mac_address varchar(17) NOT NULL,
      ip_address varchar(15) DEFAULT NULL,
      wifi_ssid varchar(100) DEFAULT NULL,
      firmware_version varchar(20) DEFAULT NULL,
      status enum('online','offline','error','maintenance') NOT NULL DEFAULT 'offline',
      last_seen timestamp NULL DEFAULT NULL,
      is_active tinyint(1) NOT NULL DEFAULT 1,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (device_id),
      UNIQUE KEY esp32_devices_mac_address_unique (mac_address),
      KEY idx_esp32_devices_status (status),
      KEY idx_esp32_devices_type (device_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS production_batches (
      batch_id int NOT NULL AUTO_INCREMENT,
      batch_code varchar(50) NOT NULL,
      batch_name varchar(255) NOT NULL,
      production_date date NOT NULL,
      total_eggs int NOT NULL DEFAULT 0,
      good_eggs int NOT NULL DEFAULT 0,
      bad_eggs int NOT NULL DEFAULT 0,
      uncertain_eggs int NOT NULL DEFAULT 0,
      status enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
      notes text,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (batch_id),
      UNIQUE KEY production_batches_batch_code_unique (batch_code),
      KEY idx_production_batches_date (production_date),
      KEY idx_production_batches_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('✅ All tables created');

  // ============================================
  // 2. SEED USERS (with proper bcrypt hash!)
  // ============================================
  console.log('👤 Seeding users...');
  const passwordHash = await bcrypt.hash('admin123', 12);
  console.log('🔐 Generated bcrypt hash for "admin123"');

  await connection.query(`DELETE FROM reports`);
  await connection.query(`DELETE FROM users`);

  await connection.query(
    `INSERT INTO users (user_id, name, email, password_hash, role, phone, bio, is_active) VALUES 
     (1, 'Super Administrator', 'admin@smarternak.com', ?, 'superadmin', '+6281234567890', 'System Administrator for Smarternak IoT Platform', 1),
     (2, 'Admin User', 'admin2@smarternak.com', ?, 'admin', '+6281234567891', 'Administrator for monitoring operations', 1)`,
    [passwordHash, passwordHash]
  );
  console.log('✅ Users seeded');

  // ============================================
  // 3. SEED ESP32 DEVICES
  // ============================================
  console.log('📡 Seeding devices...');
  await connection.query(`DELETE FROM esp32_devices`);
  await connection.query(
    `INSERT INTO esp32_devices (device_name, device_type, mac_address, ip_address, wifi_ssid, firmware_version, status, last_seen) VALUES 
     ('ESP32-CAM-001', 'esp32_cam_ai_scanner', '24:6F:28:12:34:56', '192.168.1.100', 'SmartFarm_WiFi', 'v1.2.3', 'online', NOW()),
     ('ESP32-CTRL-001', 'esp32_devkit_controller', '24:6F:28:12:34:57', '192.168.1.101', 'SmartFarm_WiFi', 'v1.2.3', 'online', NOW())`
  );
  console.log('✅ Devices seeded');

  // ============================================
  // 4. SEED PRODUCTION BATCH
  // ============================================
  console.log('📦 Seeding production batch...');
  await connection.query(`DELETE FROM production_batches`);
  await connection.query(
    `INSERT INTO production_batches (batch_code, batch_name, production_date, total_eggs, good_eggs, bad_eggs, uncertain_eggs, status) VALUES 
     ('BATCH-20250105-001', 'Production Batch January 5, 2025', '2025-01-05', 150, 120, 25, 5, 'active')`
  );
  console.log('✅ Production batch seeded');

  // ============================================
  // 5. SEED EGG SCANS
  // ============================================
  console.log('🥚 Seeding egg scans...');
  await connection.query(`DELETE FROM egg_scans`);
  await connection.query(`
    INSERT INTO egg_scans (egg_code, quality, ai_confidence, quality_score, weight, length, width, height, scanned_at) VALUES 
    ('EGG-20250105-0001', 'good', 0.9524, 95.24, 58.50, 5.85, 4.25, 4.10, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
    ('EGG-20250105-0002', 'good', 0.9385, 93.85, 59.20, 5.92, 4.30, 4.15, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
    ('EGG-20250105-0003', 'bad', 0.8245, 82.45, 52.30, 5.20, 3.95, 3.85, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
    ('EGG-20250105-0004', 'good', 0.9612, 96.12, 60.10, 6.01, 4.35, 4.20, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
    ('EGG-20250105-0005', 'uncertain', 0.7548, 75.48, 55.80, 5.58, 4.10, 4.00, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
    ('EGG-20250104-0001', 'good', 0.9425, 94.25, 57.80, 5.78, 4.20, 4.05, DATE_SUB(NOW(), INTERVAL 1 DAY)),
    ('EGG-20250104-0002', 'good', 0.9366, 93.66, 58.90, 5.89, 4.28, 4.12, DATE_SUB(NOW(), INTERVAL 25 HOUR)),
    ('EGG-20250104-0003', 'bad', 0.8156, 81.56, 51.20, 5.12, 3.90, 3.80, DATE_SUB(NOW(), INTERVAL 26 HOUR)),
    ('EGG-20250104-0004', 'good', 0.9543, 95.43, 59.70, 5.97, 4.32, 4.18, DATE_SUB(NOW(), INTERVAL 27 HOUR)),
    ('EGG-20250103-0001', 'good', 0.9287, 92.87, 57.60, 5.76, 4.18, 4.02, DATE_SUB(NOW(), INTERVAL 2 DAY)),
    ('EGG-20250103-0002', 'bad', 0.8334, 83.34, 53.10, 5.31, 4.00, 3.88, DATE_SUB(NOW(), INTERVAL 49 HOUR)),
    ('EGG-20250103-0003', 'good', 0.9456, 94.56, 59.30, 5.93, 4.29, 4.14, DATE_SUB(NOW(), INTERVAL 50 HOUR)),
    ('EGG-20250102-0001', 'good', 0.9567, 95.67, 60.20, 6.02, 4.36, 4.21, DATE_SUB(NOW(), INTERVAL 3 DAY)),
    ('EGG-20250102-0002', 'good', 0.9412, 94.12, 58.70, 5.87, 4.26, 4.09, DATE_SUB(NOW(), INTERVAL 73 HOUR)),
    ('EGG-20250102-0003', 'bad', 0.8278, 82.78, 52.80, 5.28, 3.98, 3.86, DATE_SUB(NOW(), INTERVAL 74 HOUR)),
    ('EGG-20250101-0001', 'good', 0.9498, 94.98, 59.10, 5.91, 4.28, 4.13, DATE_SUB(NOW(), INTERVAL 4 DAY)),
    ('EGG-20250101-0002', 'good', 0.9356, 93.56, 58.30, 5.83, 4.23, 4.06, DATE_SUB(NOW(), INTERVAL 97 HOUR)),
    ('EGG-20250101-0003', 'uncertain', 0.7689, 76.89, 55.40, 5.54, 4.12, 4.01, DATE_SUB(NOW(), INTERVAL 98 HOUR)),
    ('EGG-20241231-0001', 'good', 0.9445, 94.45, 58.90, 5.89, 4.27, 4.11, DATE_SUB(NOW(), INTERVAL 5 DAY)),
    ('EGG-20241231-0002', 'bad', 0.8123, 81.23, 51.50, 5.15, 3.92, 3.82, DATE_SUB(NOW(), INTERVAL 121 HOUR)),
    ('EGG-20241230-0001', 'good', 0.9523, 95.23, 59.80, 5.98, 4.33, 4.19, DATE_SUB(NOW(), INTERVAL 6 DAY)),
    ('EGG-20241230-0002', 'good', 0.9389, 93.89, 58.60, 5.86, 4.24, 4.07, DATE_SUB(NOW(), INTERVAL 145 HOUR)),
    ('EGG-20241230-0003', 'uncertain', 0.7756, 77.56, 56.20, 5.62, 4.15, 4.03, DATE_SUB(NOW(), INTERVAL 146 HOUR))
  `);
  console.log('✅ Egg scans seeded: 23 records');

  // ============================================
  // 6. SEED REPORT
  // ============================================
  console.log('📊 Seeding report...');
  await connection.query(
    `INSERT INTO reports (user_id, report_name, report_type, parameters, file_format, file_path, file_size, generated_at) VALUES 
     (1, 'Laporan Kualitas Telur - 30 Hari Terakhir', 'kualitas-telur', '{"period": "last30days", "date": null}', 'pdf', 'kualitas-telur_last30days_sample.pdf', 256834, DATE_SUB(NOW(), INTERVAL 2 HOUR))`
  );
  console.log('✅ Report seeded');

  // ============================================
  // CREATE VIEW
  // ============================================
  await connection.query(`
    CREATE OR REPLACE VIEW daily_egg_stats AS
    SELECT 
      DATE(scanned_at) as scan_date,
      COUNT(*) as total_eggs,
      SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good_eggs,
      SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad_eggs,
      SUM(CASE WHEN quality = 'uncertain' THEN 1 ELSE 0 END) as uncertain_eggs,
      ROUND((SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as good_percentage,
      ROUND((SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as bad_percentage,
      AVG(ai_confidence) as avg_confidence,
      MIN(scanned_at) as first_scan,
      MAX(scanned_at) as last_scan
    FROM egg_scans 
    GROUP BY DATE(scanned_at)
    ORDER BY scan_date DESC
  `);
  console.log('✅ View created');

  await connection.end();

  console.log('\n🎉 Database "olivia" seeded successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Superadmin: admin@smarternak.com / admin123');
  console.log('   Admin:      admin2@smarternak.com / admin123');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
