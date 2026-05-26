/**
 * Prisma Database Seed
 * Jalankan dengan: npx prisma db seed
 * atau: npm run db:seed
 *
 * Seed ini memasukkan data awal yang diperlukan:
 * - 1 superadmin user
 * - 1 admin user
 * - 2 ESP32 devices
 * - 1 production batch
 * - Sample egg scans (7 hari terakhir)
 * - 1 sample report
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ============================================
  // 1. USERS
  // ============================================
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const passwordHash = await bcrypt.hash('admin123', saltRounds);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@smarternak.com' },
    update: {},
    create: {
      name: 'Super Administrator',
      email: 'admin@smarternak.com',
      password_hash: passwordHash,
      role: 'superadmin',
      phone: '+6281234567890',
      bio: 'System Administrator for Smarternak IoT Platform',
      is_active: true,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin2@smarternak.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin2@smarternak.com',
      password_hash: passwordHash,
      role: 'admin',
      phone: '+6281234567891',
      bio: 'Administrator for monitoring operations',
      is_active: true,
      created_by: superAdmin.user_id,
    },
  });

  console.log(`✅ Users seeded: ${superAdmin.email}, ${adminUser.email}`);

  // ============================================
  // 2. ESP32 DEVICES
  // ============================================
  await prisma.esp32Device.upsert({
    where: { mac_address: '24:6F:28:12:34:56' },
    update: { status: 'online', last_seen: new Date() },
    create: {
      device_name: 'ESP32-CAM-001',
      device_type: 'esp32_cam_ai_scanner',
      mac_address: '24:6F:28:12:34:56',
      ip_address: '192.168.1.100',
      wifi_ssid: 'SmartFarm_WiFi',
      firmware_version: 'v1.2.3',
      status: 'online',
      last_seen: new Date(),
    },
  });

  await prisma.esp32Device.upsert({
    where: { mac_address: '24:6F:28:12:34:57' },
    update: { status: 'online', last_seen: new Date() },
    create: {
      device_name: 'ESP32-CTRL-001',
      device_type: 'esp32_devkit_controller',
      mac_address: '24:6F:28:12:34:57',
      ip_address: '192.168.1.101',
      wifi_ssid: 'SmartFarm_WiFi',
      firmware_version: 'v1.2.3',
      status: 'online',
      last_seen: new Date(),
    },
  });

  console.log('✅ ESP32 Devices seeded');

  // ============================================
  // 3. PRODUCTION BATCH
  // ============================================
  await prisma.productionBatch.upsert({
    where: { batch_code: 'BATCH-20250105-001' },
    update: {},
    create: {
      batch_code: 'BATCH-20250105-001',
      batch_name: 'Production Batch January 5, 2025',
      production_date: new Date('2025-01-05'),
      total_eggs: 150,
      good_eggs: 120,
      bad_eggs: 25,
      uncertain_eggs: 5,
      status: 'active',
    },
  });

  console.log('✅ Production batch seeded');

  // ============================================
  // 4. EGG SCANS (sample data)
  // ============================================
  const now = new Date();
  const daysAgo = (d, h = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    date.setHours(date.getHours() - h);
    return date;
  };

  const eggSamples = [
    // Today
    { egg_code: 'EGG-TODAY-0001', quality: 'good',      ai_confidence: 0.9524, quality_score: 95.24, weight: 58.50, length: 5.85, width: 4.25, height: 4.10, scanned_at: daysAgo(0, 1) },
    { egg_code: 'EGG-TODAY-0002', quality: 'good',      ai_confidence: 0.9385, quality_score: 93.85, weight: 59.20, length: 5.92, width: 4.30, height: 4.15, scanned_at: daysAgo(0, 2) },
    { egg_code: 'EGG-TODAY-0003', quality: 'bad',       ai_confidence: 0.8245, quality_score: 82.45, weight: 52.30, length: 5.20, width: 3.95, height: 3.85, scanned_at: daysAgo(0, 3) },
    { egg_code: 'EGG-TODAY-0004', quality: 'good',      ai_confidence: 0.9612, quality_score: 96.12, weight: 60.10, length: 6.01, width: 4.35, height: 4.20, scanned_at: daysAgo(0, 4) },
    { egg_code: 'EGG-TODAY-0005', quality: 'uncertain', ai_confidence: 0.7548, quality_score: 75.48, weight: 55.80, length: 5.58, width: 4.10, height: 4.00, scanned_at: daysAgo(0, 5) },
    // Yesterday
    { egg_code: 'EGG-D1-0001', quality: 'good', ai_confidence: 0.9425, quality_score: 94.25, weight: 57.80, length: 5.78, width: 4.20, height: 4.05, scanned_at: daysAgo(1, 8) },
    { egg_code: 'EGG-D1-0002', quality: 'good', ai_confidence: 0.9366, quality_score: 93.66, weight: 58.90, length: 5.89, width: 4.28, height: 4.12, scanned_at: daysAgo(1, 7) },
    { egg_code: 'EGG-D1-0003', quality: 'bad',  ai_confidence: 0.8156, quality_score: 81.56, weight: 51.20, length: 5.12, width: 3.90, height: 3.80, scanned_at: daysAgo(1, 6) },
    // 2 days ago
    { egg_code: 'EGG-D2-0001', quality: 'good',      ai_confidence: 0.9287, quality_score: 92.87, weight: 57.60, length: 5.76, width: 4.18, height: 4.02, scanned_at: daysAgo(2, 9) },
    { egg_code: 'EGG-D2-0002', quality: 'bad',       ai_confidence: 0.8334, quality_score: 83.34, weight: 53.10, length: 5.31, width: 4.00, height: 3.88, scanned_at: daysAgo(2, 8) },
    { egg_code: 'EGG-D2-0003', quality: 'uncertain', ai_confidence: 0.7623, quality_score: 76.23, weight: 54.90, length: 5.49, width: 4.08, height: 3.98, scanned_at: daysAgo(2, 7) },
    // 3 days ago
    { egg_code: 'EGG-D3-0001', quality: 'good', ai_confidence: 0.9567, quality_score: 95.67, weight: 60.20, length: 6.02, width: 4.36, height: 4.21, scanned_at: daysAgo(3, 10) },
    { egg_code: 'EGG-D3-0002', quality: 'good', ai_confidence: 0.9412, quality_score: 94.12, weight: 58.70, length: 5.87, width: 4.26, height: 4.09, scanned_at: daysAgo(3, 9) },
    { egg_code: 'EGG-D3-0003', quality: 'bad',  ai_confidence: 0.8278, quality_score: 82.78, weight: 52.80, length: 5.28, width: 3.98, height: 3.86, scanned_at: daysAgo(3, 8) },
  ];

  for (const egg of eggSamples) {
    await prisma.eggScan.upsert({
      where: { egg_code: egg.egg_code },
      update: {},
      create: egg,
    });
  }

  console.log(`✅ Egg scans seeded: ${eggSamples.length} records`);

  // ============================================
  // 5. SAMPLE REPORT
  // ============================================
  const existingReport = await prisma.report.findFirst({
    where: { user_id: superAdmin.user_id, report_type: 'kualitas_telur' },
  });

  if (!existingReport) {
    await prisma.report.create({
      data: {
        user_id: superAdmin.user_id,
        report_name: 'Laporan Kualitas Telur - 30 Hari Terakhir',
        report_type: 'kualitas_telur',
        parameters: { period: 'last30days', date: null },
        file_format: 'pdf',
        file_path: 'kualitas-telur_last30days_sample.pdf',
        file_size: 256834,
        generated_at: daysAgo(0, 2),
      },
    });
    console.log('✅ Sample report seeded');
  }

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Superadmin: admin@smarternak.com / admin123');
  console.log('   Admin:      admin2@smarternak.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
