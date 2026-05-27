const path = require('path');
const fs = require('fs');

// Load env variables from the backend directory to be consistent
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { pool, testConnection } = require('./config/database');

async function runMigration() {
  console.log('====================================');
  console.log('🚀 Running Sensor Readings Migration');
  console.log('====================================');
  console.log('Target Database Configuration:');
  console.log(`- Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`- Port: ${process.env.DB_PORT || 3306}`);
  console.log(`- User: ${process.env.DB_USER || 'root'}`);
  console.log(`- Database: ${process.env.DB_NAME || 'db_smarternak'}`);
  console.log('------------------------------------\n');

  try {
    // 1. Check database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Connection failed. Please ensure MySQL is running.');
      process.exit(1);
    }

    // 2. Read migration file
    const sqlPath = path.resolve(__dirname, 'migrations/add_sensor_readings.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ Migration file not found at: ${sqlPath}`);
      process.exit(1);
    }

    console.log(`📖 Reading SQL file from: ${sqlPath}`);
    let sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // 3. Clean and split queries
    // Remove comments starting with --
    sqlContent = sqlContent.replace(/--.*$/gm, '');
    
    // Split by semicolon, filter out empty queries
    const queries = sqlContent
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    console.log(`📋 Found ${queries.length} SQL statements to execute.`);

    // 4. Run queries
    const connection = await pool.getConnection();
    console.log('⚡ Connected to pool. Running queries...');
    
    try {
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        
        // Log query snippet
        const querySnippet = query.replace(/\s+/g, ' ').substring(0, 60);
        console.log(`👉 [${i + 1}/${queries.length}] Executing: "${querySnippet}..."`);

        // If the query is a USE statement, let's verify if the database exists or create it
        if (query.toUpperCase().startsWith('USE ')) {
          const dbName = query.match(/USE\s+`?(\w+)`?/i)[1];
          console.log(`   Switching database context to: ${dbName}`);
          // Let's ensure the database exists first
          await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        }

        await connection.query(query);
      }
      console.log('\n====================================');
      console.log('✅ Migration Completed Successfully!');
      console.log('====================================');
    } catch (queryError) {
      console.error('\n❌ Query Execution Error!');
      console.error(`Failed Statement:`);
      console.error(queryError.sql || 'Unknown query');
      console.error(`Error Message: ${queryError.message}`);
      throw queryError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('\n❌ Migration Failed:', error.message);
  } finally {
    // End the pool so the process can exit
    await pool.end();
    process.exit(0);
  }
}

runMigration();
