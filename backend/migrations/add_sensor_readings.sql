-- ============================================
-- Sensor Readings Table + Sample Data
-- For Eggspire IoT Monitoring Dashboard
-- ============================================

USE `olivia`;

-- Create sensor_readings table
CREATE TABLE IF NOT EXISTS `sensor_readings` (
  `reading_id` int NOT NULL AUTO_INCREMENT,
  `device_id` int DEFAULT NULL,
  `temperature` decimal(5,2) DEFAULT NULL COMMENT 'Suhu (°C)',
  `humidity` decimal(5,2) DEFAULT NULL COMMENT 'Kelembapan (%)',
  `ammonia` decimal(6,2) DEFAULT NULL COMMENT 'Kadar Gas Amonia (ppm)',
  `recorded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reading_id`),
  KEY `idx_sensor_recorded_at` (`recorded_at`),
  KEY `idx_sensor_device_id` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT SAMPLE DATA (last 24 hours, every 1 hour)
-- Simulates realistic poultry house sensor readings
-- Temperature: 25-32°C (optimal for egg production)
-- Humidity: 55-75% (optimal range)
-- Ammonia: 5-25 ppm (safe < 25ppm)
-- ============================================

INSERT INTO `sensor_readings` (`device_id`, `temperature`, `humidity`, `ammonia`, `recorded_at`) VALUES
-- 24 hours ago to now (hourly readings)
(1, 27.50, 65.20, 12.30, DATE_SUB(NOW(), INTERVAL 24 HOUR)),
(1, 27.80, 64.80, 11.80, DATE_SUB(NOW(), INTERVAL 23 HOUR)),
(1, 28.10, 63.50, 12.50, DATE_SUB(NOW(), INTERVAL 22 HOUR)),
(1, 28.50, 62.00, 13.20, DATE_SUB(NOW(), INTERVAL 21 HOUR)),
(1, 29.20, 60.50, 14.10, DATE_SUB(NOW(), INTERVAL 20 HOUR)),
(1, 29.80, 59.80, 15.50, DATE_SUB(NOW(), INTERVAL 19 HOUR)),
(1, 30.50, 58.20, 16.80, DATE_SUB(NOW(), INTERVAL 18 HOUR)),
(1, 31.20, 57.00, 18.20, DATE_SUB(NOW(), INTERVAL 17 HOUR)),
(1, 31.80, 56.50, 19.50, DATE_SUB(NOW(), INTERVAL 16 HOUR)),
(1, 32.00, 55.80, 20.30, DATE_SUB(NOW(), INTERVAL 15 HOUR)),
(1, 31.50, 56.20, 19.80, DATE_SUB(NOW(), INTERVAL 14 HOUR)),
(1, 30.80, 57.50, 18.50, DATE_SUB(NOW(), INTERVAL 13 HOUR)),
(1, 30.20, 59.00, 17.20, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
(1, 29.50, 61.20, 15.80, DATE_SUB(NOW(), INTERVAL 11 HOUR)),
(1, 28.80, 63.00, 14.50, DATE_SUB(NOW(), INTERVAL 10 HOUR)),
(1, 28.20, 64.50, 13.20, DATE_SUB(NOW(), INTERVAL 9 HOUR)),
(1, 27.80, 65.80, 12.50, DATE_SUB(NOW(), INTERVAL 8 HOUR)),
(1, 27.50, 66.50, 11.80, DATE_SUB(NOW(), INTERVAL 7 HOUR)),
(1, 27.20, 67.20, 11.20, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
(1, 27.00, 68.00, 10.80, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(1, 27.30, 67.50, 11.50, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(1, 27.80, 66.80, 12.00, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(1, 28.20, 65.50, 12.80, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(1, 28.50, 64.80, 13.50, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(1, 28.80, 64.20, 14.00, NOW()),

-- Additional readings for 7-day chart (4 readings per day for past 6 days)
-- Day -1
(1, 28.00, 65.00, 13.00, DATE_SUB(NOW(), INTERVAL 30 HOUR)),
(1, 30.50, 58.50, 17.50, DATE_SUB(NOW(), INTERVAL 36 HOUR)),
(1, 31.00, 57.00, 18.00, DATE_SUB(NOW(), INTERVAL 42 HOUR)),
(1, 27.50, 66.00, 11.50, DATE_SUB(NOW(), INTERVAL 48 HOUR)),
-- Day -2
(1, 27.80, 65.50, 12.00, DATE_SUB(NOW(), INTERVAL 54 HOUR)),
(1, 30.20, 59.00, 16.50, DATE_SUB(NOW(), INTERVAL 60 HOUR)),
(1, 31.50, 56.00, 19.00, DATE_SUB(NOW(), INTERVAL 66 HOUR)),
(1, 28.00, 64.50, 13.50, DATE_SUB(NOW(), INTERVAL 72 HOUR)),
-- Day -3
(1, 27.20, 67.00, 11.00, DATE_SUB(NOW(), INTERVAL 78 HOUR)),
(1, 29.80, 60.00, 15.50, DATE_SUB(NOW(), INTERVAL 84 HOUR)),
(1, 31.80, 55.50, 20.00, DATE_SUB(NOW(), INTERVAL 90 HOUR)),
(1, 28.50, 63.50, 14.00, DATE_SUB(NOW(), INTERVAL 96 HOUR)),
-- Day -4
(1, 27.50, 66.50, 12.00, DATE_SUB(NOW(), INTERVAL 102 HOUR)),
(1, 30.00, 59.50, 16.00, DATE_SUB(NOW(), INTERVAL 108 HOUR)),
(1, 32.00, 55.00, 21.00, DATE_SUB(NOW(), INTERVAL 114 HOUR)),
(1, 28.80, 63.00, 14.50, DATE_SUB(NOW(), INTERVAL 120 HOUR)),
-- Day -5
(1, 27.00, 68.00, 10.50, DATE_SUB(NOW(), INTERVAL 126 HOUR)),
(1, 29.50, 61.00, 15.00, DATE_SUB(NOW(), INTERVAL 132 HOUR)),
(1, 31.20, 56.50, 18.50, DATE_SUB(NOW(), INTERVAL 138 HOUR)),
(1, 28.20, 64.00, 13.00, DATE_SUB(NOW(), INTERVAL 144 HOUR)),
-- Day -6
(1, 27.80, 66.00, 11.50, DATE_SUB(NOW(), INTERVAL 150 HOUR)),
(1, 30.50, 58.00, 17.00, DATE_SUB(NOW(), INTERVAL 156 HOUR)),
(1, 31.50, 55.50, 19.50, DATE_SUB(NOW(), INTERVAL 162 HOUR)),
(1, 28.00, 65.00, 12.50, DATE_SUB(NOW(), INTERVAL 168 HOUR));
