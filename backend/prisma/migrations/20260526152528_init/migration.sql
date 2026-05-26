-- CreateTable
CREATE TABLE `users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'superadmin') NOT NULL DEFAULT 'admin',
    `phone` VARCHAR(20) NULL,
    `bio` TEXT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `email_verified_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `idx_users_role`(`role`),
    INDEX `idx_users_active`(`is_active`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `egg_scans` (
    `scan_id` INTEGER NOT NULL AUTO_INCREMENT,
    `egg_code` VARCHAR(50) NOT NULL,
    `quality` ENUM('good', 'bad', 'uncertain') NOT NULL,
    `ai_confidence` DECIMAL(5, 4) NULL,
    `quality_score` DECIMAL(5, 2) NULL,
    `image` VARCHAR(500) NULL,
    `weight` DECIMAL(6, 2) NULL,
    `length` DECIMAL(5, 2) NULL,
    `width` DECIMAL(5, 2) NULL,
    `height` DECIMAL(5, 2) NULL,
    `scanned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `egg_scans_egg_code_key`(`egg_code`),
    INDEX `idx_egg_scans_quality`(`quality`),
    INDEX `idx_egg_scans_scanned_at`(`scanned_at`),
    PRIMARY KEY (`scan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `report_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `report_name` VARCHAR(255) NOT NULL,
    `report_type` ENUM('kualitas-telur', 'statistik-produksi', 'riwayat-aktivitas') NOT NULL,
    `parameters` JSON NULL,
    `file_format` ENUM('pdf', 'excel', 'csv') NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size` BIGINT NULL,
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,
    `download_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_reports_user_id`(`user_id`),
    INDEX `idx_reports_type`(`report_type`),
    INDEX `idx_reports_generated_at`(`generated_at`),
    PRIMARY KEY (`report_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `esp32_devices` (
    `device_id` INTEGER NOT NULL AUTO_INCREMENT,
    `device_name` VARCHAR(255) NOT NULL,
    `device_type` ENUM('esp32_cam_ai_scanner', 'esp32_devkit_controller') NOT NULL,
    `mac_address` VARCHAR(17) NOT NULL,
    `ip_address` VARCHAR(15) NULL,
    `wifi_ssid` VARCHAR(100) NULL,
    `firmware_version` VARCHAR(20) NULL,
    `status` ENUM('online', 'offline', 'error', 'maintenance') NOT NULL DEFAULT 'offline',
    `last_seen` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `esp32_devices_mac_address_key`(`mac_address`),
    INDEX `idx_esp32_devices_status`(`status`),
    INDEX `idx_esp32_devices_type`(`device_type`),
    PRIMARY KEY (`device_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_batches` (
    `batch_id` INTEGER NOT NULL AUTO_INCREMENT,
    `batch_code` VARCHAR(50) NOT NULL,
    `batch_name` VARCHAR(255) NOT NULL,
    `production_date` DATE NOT NULL,
    `total_eggs` INTEGER NOT NULL DEFAULT 0,
    `good_eggs` INTEGER NOT NULL DEFAULT 0,
    `bad_eggs` INTEGER NOT NULL DEFAULT 0,
    `uncertain_eggs` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `production_batches_batch_code_key`(`batch_code`),
    INDEX `idx_production_batches_date`(`production_date`),
    INDEX `idx_production_batches_status`(`status`),
    PRIMARY KEY (`batch_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
