const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables dari backend/.env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Bangun DATABASE_URL secara dinamis jika tidak didefinisikan di .env
if (!process.env.DATABASE_URL) {
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '3306';
  const dbName = process.env.DB_NAME || 'olivia';
  
  // URL encode password jika mengandung karakter khusus
  const encodedPassword = encodeURIComponent(dbPassword);
  process.env.DATABASE_URL = `mysql://${dbUser}:${encodedPassword}@${dbHost}:${dbPort}/${dbName}`;
  console.log(`🔌 Generated DATABASE_URL: mysql://${dbUser}:*****@${dbHost}:${dbPort}/${dbName}`);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const backupPath = path.resolve(__dirname, '../users_backup.json');

async function main() {
  console.log('==================================================');
  console.log('🌱 Start: Migration Fresh & Keep User Accounts');
  console.log('==================================================\n');

  try {
    // 1. Membaca data user dari database
    console.log('🔍 Step 1: Membaca data user dari database...');
    const users = await prisma.user.findMany();
    console.log(`   Ditemukan ${users.length} user di database.`);

    if (users.length === 0) {
      console.log('⚠️ Tidak ada user untuk dibackup. Melanjutkan ke reset...');
    } else {
      // Simpan data user ke file backup sementara
      fs.writeFileSync(backupPath, JSON.stringify(users, null, 2), 'utf-8');
      console.log(`✅ Backup user berhasil disimpan sementara di: ${backupPath}`);
    }

    // Disconnect prisma client sebelum menjalankan migrasi agar koneksi database tidak terkunci
    await prisma.$disconnect();

    // 2. Menjalankan prisma migrate reset
    console.log('\n⚙️ Step 2: Menjalankan migration reset (menghapus & membuat ulang tabel)...');
    // --skip-seed digunakan agar kita tidak menumpuk seed bawaan secara duplikat, 
    // karena kita akan mengembalikan semua user asli dari backup.
    execSync('npx prisma migrate reset --force --skip-seed', { 
      stdio: 'inherit', 
      cwd: path.resolve(__dirname, '..') 
    });
    console.log('✅ Database berhasil di-reset.');

    // 2b. Jalankan custom migration untuk tabel sensor_readings
    console.log('\n📦 Step 2b: Menjalankan custom migration untuk tabel sensor_readings...');
    execSync('node run-migration.js', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    console.log('✅ Custom migration sensor_readings berhasil dijalankan.');

    // Reconnect Prisma
    await prisma.$connect();

    // 3. Memulihkan (Restore) data user dari file backup
    if (fs.existsSync(backupPath)) {
      console.log('\n🔄 Step 3: Memulihkan (Restore) data user...');
      const usersData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

      // Urutkan user berdasarkan user_id agar berurutan saat di-insert
      usersData.sort((a, b) => a.user_id - b.user_id);

      // Phase 3a: Masukkan semua user dengan created_by = null
      // Ini dilakukan agar tidak terjadi error foreign key constraint jika user pembuat (creator) belum di-insert
      console.log('   -> Memasukkan data user (tanpa relasi created_by)...');
      for (const user of usersData) {
        // Hapus property relation yang mungkin terikut
        const { creator, createdUsers, ...userData } = user;
        
        // Kembalikan format tanggal menjadi Date object
        userData.created_at = new Date(userData.created_at);
        userData.updated_at = new Date(userData.updated_at);
        if (userData.email_verified_at) {
          userData.email_verified_at = new Date(userData.email_verified_at);
        }

        // Set sementara created_by ke null
        userData.created_by = null;

        await prisma.user.create({
          data: userData
        });
      }

      // Phase 3b: Update kembali field created_by untuk memulihkan relasi pembuat
      console.log('   -> Menghubungkan kembali relasi pembuat (created_by)...');
      for (const user of usersData) {
        if (user.created_by) {
          await prisma.user.update({
            where: { user_id: user.user_id },
            data: { created_by: user.created_by }
          });
        }
      }

      console.log(`✅ Berhasil memulihkan ${usersData.length} user ke database.`);

      // 4. Hapus file backup sementara
      fs.unlinkSync(backupPath);
      console.log('🧹 File backup sementara telah dihapus.');
    } else {
      console.log('\nℹ️ Tidak ada user untuk dipulihkan.');
    }

    console.log('\n==================================================');
    console.log('🎉 Selesai! Migration fresh sukses & data user tetap utuh.');
    console.log('==================================================');
  } catch (error) {
    console.error('\n❌ Terjadi error saat proses:', error);
    if (fs.existsSync(backupPath)) {
      console.log(`\n⚠️ Backup user masih tersimpan aman di: ${backupPath}`);
      console.log('Anda bisa memulihkannya secara manual atau menjalankan ulang script.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
