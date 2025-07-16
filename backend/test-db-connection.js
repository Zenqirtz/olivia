const { testConnection, executeQuery } = require('./config/database');

async function testDatabaseSetup() {
  console.log('🔍 Testing database connection and setup...\n');
  
  try {
    // Test connection
    console.log('1. Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.log('❌ Database connection failed!');
      return;
    }
    
    // Test if tables exist
    console.log('\n2. Checking if required tables exist...');
    const tablesQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'db_smarternak' 
      AND TABLE_NAME IN ('users', 'egg_scans', 'production_batches')
    `;
    
    const tablesResult = await executeQuery(tablesQuery);
    
    if (tablesResult.success) {
      console.log('✅ Found tables:', tablesResult.data.map(row => row.TABLE_NAME).join(', '));
    } else {
      console.log('❌ Error checking tables:', tablesResult.error);
      return;
    }
    
    // Test if sample data exists
    console.log('\n3. Checking sample data...');
    const eggCountQuery = 'SELECT COUNT(*) as count FROM egg_scans';
    const eggCountResult = await executeQuery(eggCountQuery);
    
    if (eggCountResult.success) {
      const count = eggCountResult.data[0].count;
      console.log(`✅ Found ${count} egg records in database`);
      
      if (count === 0) {
        console.log('⚠️  No sample data found. Run the sample data script:');
        console.log('   mysql -u root -p db_smarternak < backend/scripts/add_sample_eggs.sql');
      }
    } else {
      console.log('❌ Error checking egg data:', eggCountResult.error);
    }
    
    // Test users table
    console.log('\n4. Checking users...');
    const userCountQuery = 'SELECT COUNT(*) as count FROM users';
    const userCountResult = await executeQuery(userCountQuery);
    
    if (userCountResult.success) {
      const count = userCountResult.data[0].count;
      console.log(`✅ Found ${count} users in database`);
      
      if (count === 0) {
        console.log('⚠️  No users found. Run the database schema script first:');
        console.log('   mysql -u root -p db_smarternak < database_schema_simple.sql');
      }
    } else {
      console.log('❌ Error checking users:', userCountResult.error);
    }
    
    console.log('\n🎉 Database test completed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
  
  process.exit(0);
}

testDatabaseSetup(); 