const { executeQuery } = require('./config/database');

async function testEggAPI() {
  console.log('🧪 Testing Egg API with current database structure...\n');
  
  try {
    // Test 1: Check table structure
    console.log('1. Checking egg_scans table structure...');
    const structureQuery = `
      DESCRIBE egg_scans
    `;
    
    const structureResult = await executeQuery(structureQuery);
    
    if (structureResult.success) {
      console.log('✅ Table structure:');
      structureResult.data.forEach(column => {
        console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'YES' ? '(nullable)' : '(not null)'}`);
      });
    } else {
      console.log('❌ Error checking table structure:', structureResult.error);
      return;
    }
    
    // Test 2: Test basic SELECT query (like getAllEggs)
    console.log('\n2. Testing basic SELECT query...');
    const selectQuery = `
      SELECT 
        scan_id,
        egg_code,
        quality,
        image,
        scanned_at,
        created_at
      FROM egg_scans
      ORDER BY scanned_at DESC
      LIMIT 5
    `;
    
    const selectResult = await executeQuery(selectQuery);
    
    if (selectResult.success) {
      console.log(`✅ Found ${selectResult.data.length} eggs`);
      if (selectResult.data.length > 0) {
        const firstEgg = selectResult.data[0];
        console.log('   Sample egg:', {
          scan_id: firstEgg.scan_id,
          egg_code: firstEgg.egg_code,
          quality: firstEgg.quality,
          scanned_at: firstEgg.scanned_at
        });
      }
    } else {
      console.log('❌ Error in SELECT query:', selectResult.error);
      return;
    }
    
    // Test 3: Test statistics query
    console.log('\n3. Testing statistics query...');
    const statsQuery = `
      SELECT 
        DATE(scanned_at) as scan_date,
        COUNT(*) as total_eggs,
        SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good_eggs,
        SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad_eggs,
        ROUND((SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as good_percentage
      FROM egg_scans 
      WHERE DATE(scanned_at) = CURDATE()
      GROUP BY DATE(scanned_at)
    `;
    
    const statsResult = await executeQuery(statsQuery);
    
    if (statsResult.success) {
      if (statsResult.data.length > 0) {
        const stats = statsResult.data[0];
        console.log('✅ Today\'s statistics:', {
          total_eggs: stats.total_eggs,
          good_eggs: stats.good_eggs,
          bad_eggs: stats.bad_eggs,
          good_percentage: stats.good_percentage + '%'
        });
      } else {
        console.log('⚠️  No data for today. Run sample data script:');
        console.log('   mysql -u root -p db_smarternak < backend/scripts/add_sample_eggs.sql');
      }
    } else {
      console.log('❌ Error in statistics query:', statsResult.error);
      return;
    }
    
    // Test 4: Test date filtering
    console.log('\n4. Testing date filtering...');
    const dateFilterQuery = `
      SELECT COUNT(*) as count
      FROM egg_scans
      WHERE DATE(scanned_at) = CURDATE()
    `;
    
    const dateFilterResult = await executeQuery(dateFilterQuery);
    
    if (dateFilterResult.success) {
      const count = dateFilterResult.data[0].count;
      console.log(`✅ Found ${count} eggs for today`);
    } else {
      console.log('❌ Error in date filter query:', dateFilterResult.error);
    }
    
    // Test 5: Test quality filtering
    console.log('\n5. Testing quality filtering...');
    const qualityFilterQuery = `
      SELECT 
        quality,
        COUNT(*) as count
      FROM egg_scans
      GROUP BY quality
    `;
    
    const qualityFilterResult = await executeQuery(qualityFilterQuery);
    
    if (qualityFilterResult.success) {
      console.log('✅ Quality distribution:');
      qualityFilterResult.data.forEach(row => {
        console.log(`   - ${row.quality}: ${row.count} eggs`);
      });
    } else {
      console.log('❌ Error in quality filter query:', qualityFilterResult.error);
    }
    
    console.log('\n🎉 All egg API tests completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Start backend: cd backend && npm start');
    console.log('2. Start frontend: npm run dev');
    console.log('3. Login and test the Data Kualitas Telur page');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testEggAPI(); 