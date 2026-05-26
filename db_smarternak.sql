-- ============================================
-- Smarternak Database - MySQL 8.0.42 Compatible
-- IoT Egg Quality Monitoring System
-- ============================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS `db_smarternak` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `db_smarternak`;

-- ============================================
-- 1. USERS TABLE
-- ============================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','superadmin') NOT NULL DEFAULT 'admin',
  `phone` varchar(20) DEFAULT NULL,
  `bio` text,
  `avatar_url` varchar(500) DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_active` (`is_active`),
  KEY `fk_users_created_by` (`created_by`),
  CONSTRAINT `fk_users_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. EGG_SCANS TABLE (Main table for egg data)
-- ============================================
DROP TABLE IF EXISTS `egg_scans`;
CREATE TABLE `egg_scans` (
  `scan_id` int NOT NULL AUTO_INCREMENT,
  `egg_code` varchar(50) NOT NULL,
  `quality` enum('good','bad','uncertain') NOT NULL,
  `ai_confidence` decimal(5,4) DEFAULT NULL,
  `quality_score` decimal(5,2) DEFAULT NULL,
  `image` varchar(500) DEFAULT NULL,
  `weight` decimal(6,2) DEFAULT NULL,
  `length` decimal(5,2) DEFAULT NULL,
  `width` decimal(5,2) DEFAULT NULL,
  `height` decimal(5,2) DEFAULT NULL,
  `scanned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`scan_id`),
  UNIQUE KEY `egg_scans_egg_code_unique` (`egg_code`),
  KEY `idx_egg_scans_quality` (`quality`),
  KEY `idx_egg_scans_scanned_at` (`scanned_at`),
  KEY `idx_egg_scans_date` (`scanned_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. REPORTS TABLE
-- ============================================
DROP TABLE IF EXISTS `reports`;
CREATE TABLE `reports` (
  `report_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `report_name` varchar(255) NOT NULL,
  `report_type` enum('kualitas-telur','statistik-produksi','riwayat-aktivitas') NOT NULL,
  `parameters` json DEFAULT NULL,
  `file_format` enum('pdf','excel','csv') NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` bigint DEFAULT NULL,
  `generated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  `download_count` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`report_id`),
  KEY `idx_reports_user_id` (`user_id`),
  KEY `idx_reports_type` (`report_type`),
  KEY `idx_reports_generated_at` (`generated_at`),
  CONSTRAINT `fk_reports_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. ESP32_DEVICES TABLE (For IoT device management)
-- ============================================
DROP TABLE IF EXISTS `esp32_devices`;
CREATE TABLE `esp32_devices` (
  `device_id` int NOT NULL AUTO_INCREMENT,
  `device_name` varchar(255) NOT NULL,
  `device_type` enum('esp32_cam_ai_scanner','esp32_devkit_controller') NOT NULL,
  `mac_address` varchar(17) NOT NULL,
  `ip_address` varchar(15) DEFAULT NULL,
  `wifi_ssid` varchar(100) DEFAULT NULL,
  `firmware_version` varchar(20) DEFAULT NULL,
  `status` enum('online','offline','error','maintenance') NOT NULL DEFAULT 'offline',
  `last_seen` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`device_id`),
  UNIQUE KEY `esp32_devices_mac_address_unique` (`mac_address`),
  KEY `idx_esp32_devices_status` (`status`),
  KEY `idx_esp32_devices_type` (`device_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. PRODUCTION_BATCHES TABLE (For batch tracking)
-- ============================================
DROP TABLE IF EXISTS `production_batches`;
CREATE TABLE `production_batches` (
  `batch_id` int NOT NULL AUTO_INCREMENT,
  `batch_code` varchar(50) NOT NULL,
  `batch_name` varchar(255) NOT NULL,
  `production_date` date NOT NULL,
  `total_eggs` int NOT NULL DEFAULT '0',
  `good_eggs` int NOT NULL DEFAULT '0',
  `bad_eggs` int NOT NULL DEFAULT '0',
  `uncertain_eggs` int NOT NULL DEFAULT '0',
  `status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`batch_id`),
  UNIQUE KEY `production_batches_batch_code_unique` (`batch_code`),
  KEY `idx_production_batches_date` (`production_date`),
  KEY `idx_production_batches_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Insert default superadmin user
-- Password: admin123 (hashed with bcrypt)
INSERT INTO `users` (`user_id`, `name`, `email`, `password_hash`, `role`, `phone`, `bio`, `is_active`, `created_at`) VALUES
(1, 'Super Administrator', 'admin@smarternak.com', '$2a$12$LQv3c1yqBwEHFNdlYqZKKe8Y9T0J2KvLcP6Zx2C8MzI6Y4QxZ7wZK', 'superadmin', '+6281234567890', 'System Administrator for Smarternak IoT Platform', 1, '2025-01-01 00:00:00'),
(2, 'Admin User', 'admin2@smarternak.com', '$2a$12$LQv3c1yqBwEHFNdlYqZKKe8Y9T0J2KvLcP6Zx2C8MzI6Y4QxZ7wZK', 'admin', '+6281234567891', 'Administrator for monitoring operations', 1, '2025-01-01 00:00:00');

-- Insert ESP32 devices
INSERT INTO `esp32_devices` (`device_id`, `device_name`, `device_type`, `mac_address`, `ip_address`, `wifi_ssid`, `firmware_version`, `status`, `last_seen`) VALUES
(1, 'ESP32-CAM-001', 'esp32_cam_ai_scanner', '24:6F:28:12:34:56', '192.168.1.100', 'SmartFarm_WiFi', 'v1.2.3', 'online', NOW()),
(2, 'ESP32-CTRL-001', 'esp32_devkit_controller', '24:6F:28:12:34:57', '192.168.1.101', 'SmartFarm_WiFi', 'v1.2.3', 'online', NOW());

-- Insert production batch
INSERT INTO `production_batches` (`batch_id`, `batch_code`, `batch_name`, `production_date`, `total_eggs`, `good_eggs`, `bad_eggs`, `uncertain_eggs`, `status`) VALUES
(1, 'BATCH-20250105-001', 'Production Batch January 5, 2025', '2025-01-05', 150, 120, 25, 5, 'active');

-- Insert sample egg scans data for the last 7 days
INSERT INTO `egg_scans` (`scan_id`, `egg_code`, `quality`, `ai_confidence`, `quality_score`, `weight`, `length`, `width`, `height`, `scanned_at`) VALUES
-- Today's data
(1, 'EGG-20250105-0001', 'good', 0.9524, 95.24, 58.50, 5.85, 4.25, 4.10, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(2, 'EGG-20250105-0002', 'good', 0.9385, 93.85, 59.20, 5.92, 4.30, 4.15, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(3, 'EGG-20250105-0003', 'bad', 0.8245, 82.45, 52.30, 5.20, 3.95, 3.85, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(4, 'EGG-20250105-0004', 'good', 0.9612, 96.12, 60.10, 6.01, 4.35, 4.20, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(5, 'EGG-20250105-0005', 'uncertain', 0.7548, 75.48, 55.80, 5.58, 4.10, 4.00, DATE_SUB(NOW(), INTERVAL 5 HOUR)),

-- Yesterday's data
(6, 'EGG-20250104-0001', 'good', 0.9425, 94.25, 57.80, 5.78, 4.20, 4.05, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 8 HOUR),
(7, 'EGG-20250104-0002', 'good', 0.9366, 93.66, 58.90, 5.89, 4.28, 4.12, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 7 HOUR),
(8, 'EGG-20250104-0003', 'bad', 0.8156, 81.56, 51.20, 5.12, 3.90, 3.80, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 6 HOUR),
(9, 'EGG-20250104-0004', 'good', 0.9543, 95.43, 59.70, 5.97, 4.32, 4.18, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 5 HOUR),
(10, 'EGG-20250104-0005', 'good', 0.9478, 94.78, 58.40, 5.84, 4.25, 4.08, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 4 HOUR),

-- 2 days ago
(11, 'EGG-20250103-0001', 'good', 0.9287, 92.87, 57.60, 5.76, 4.18, 4.02, DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 9 HOUR),
(12, 'EGG-20250103-0002', 'bad', 0.8334, 83.34, 53.10, 5.31, 4.00, 3.88, DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 8 HOUR),
(13, 'EGG-20250103-0003', 'good', 0.9456, 94.56, 59.30, 5.93, 4.29, 4.14, DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 7 HOUR),
(14, 'EGG-20250103-0004', 'uncertain', 0.7623, 76.23, 54.90, 5.49, 4.08, 3.98, DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 6 HOUR),

-- 3 days ago
(15, 'EGG-20250102-0001', 'good', 0.9567, 95.67, 60.20, 6.02, 4.36, 4.21, DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 10 HOUR),
(16, 'EGG-20250102-0002', 'good', 0.9412, 94.12, 58.70, 5.87, 4.26, 4.09, DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 9 HOUR),
(17, 'EGG-20250102-0003', 'bad', 0.8278, 82.78, 52.80, 5.28, 3.98, 3.86, DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 8 HOUR),

-- 4 days ago
(18, 'EGG-20250101-0001', 'good', 0.9498, 94.98, 59.10, 5.91, 4.28, 4.13, DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 11 HOUR),
(19, 'EGG-20250101-0002', 'good', 0.9356, 93.56, 58.30, 5.83, 4.23, 4.06, DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 10 HOUR),
(20, 'EGG-20250101-0003', 'uncertain', 0.7689, 76.89, 55.40, 5.54, 4.12, 4.01, DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 9 HOUR),

-- 5 days ago
(21, 'EGG-20241231-0001', 'good', 0.9445, 94.45, 58.90, 5.89, 4.27, 4.11, DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 12 HOUR),
(22, 'EGG-20241231-0002', 'bad', 0.8123, 81.23, 51.50, 5.15, 3.92, 3.82, DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 11 HOUR),

-- 6 days ago
(23, 'EGG-20241230-0001', 'good', 0.9523, 95.23, 59.80, 5.98, 4.33, 4.19, DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 13 HOUR),
(24, 'EGG-20241230-0002', 'good', 0.9389, 93.89, 58.60, 5.86, 4.24, 4.07, DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 12 HOUR),
(25, 'EGG-20241230-0003', 'uncertain', 0.7756, 77.56, 56.20, 5.62, 4.15, 4.03, DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 11 HOUR);

-- Insert sample report
INSERT INTO `reports` (`report_id`, `user_id`, `report_name`, `report_type`, `parameters`, `file_format`, `file_path`, `file_size`, `generated_at`) VALUES
(1, 1, 'Laporan Kualitas Telur - 30 Hari Terakhir', 'kualitas-telur', '{"period": "last30days", "date": null}', 'pdf', 'kualitas-telur_last30days_1748713472001.pdf', 256834, DATE_SUB(NOW(), INTERVAL 2 HOUR));

-- ============================================
-- CREATE VIEWS FOR EASY DATA ACCESS
-- ============================================

-- View for daily statistics
CREATE OR REPLACE VIEW `daily_egg_stats` AS
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
ORDER BY scan_date DESC;

-- ============================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- ============================================

-- Additional indexes for performance
CREATE INDEX idx_egg_scans_quality_date ON egg_scans (quality, scanned_at);
CREATE INDEX idx_reports_user_type_date ON reports (user_id, report_type, generated_at);

-- ============================================
-- COMMIT TRANSACTION
-- ============================================

COMMIT;

-- ============================================
-- SHOW CREATED TABLES
-- ============================================

SHOW TABLES;

-- Show row counts
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 
    'egg_scans' as table_name, COUNT(*) as row_count FROM egg_scans
UNION ALL
SELECT 
    'reports' as table_name, COUNT(*) as row_count FROM reports
UNION ALL
SELECT 
    'esp32_devices' as table_name, COUNT(*) as row_count FROM esp32_devices
UNION ALL
SELECT 
    'production_batches' as table_name, COUNT(*) as row_count FROM production_batches;

-- Show today's egg statistics
SELECT 
    DATE(scanned_at) as today,
    COUNT(*) as total_eggs,
    SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good_eggs,
    SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad_eggs,
    SUM(CASE WHEN quality = 'uncertain' THEN 1 ELSE 0 END) as uncertain_eggs,
    ROUND(AVG(ai_confidence) * 100, 2) as avg_confidence_percent
FROM egg_scans 
WHERE DATE(scanned_at) = CURDATE()
GROUP BY DATE(scanned_at);

-- ============================================
-- END OF SCRIPT
-- ============================================ 