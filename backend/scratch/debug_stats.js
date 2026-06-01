const { executeQuery } = require('../config/database');

async function debugStats() {
  console.log('--- DEBUG DATABASE STATS ---');
  
  // 1. Total Scans Summary
  const summaryResult = await executeQuery(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good,
      SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad,
      SUM(CASE WHEN quality = 'uncertain' THEN 1 ELSE 0 END) as uncertain
    FROM egg_scans
  `);
  console.log('Overall Summary:', summaryResult);

  // 2. Daily Stats
  const statsResult = await executeQuery(`
    SELECT 
      DATE_FORMAT(scanned_at, '%Y-%m-%d') as scan_date,
      COUNT(*) as total_eggs,
      SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good_eggs,
      SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad_eggs,
      SUM(CASE WHEN quality = 'uncertain' THEN 1 ELSE 0 END) as uncertain_eggs
    FROM egg_scans
    GROUP BY DATE_FORMAT(scanned_at, '%Y-%m-%d')
    ORDER BY scan_date DESC
    LIMIT 15
  `);
  console.log('Daily Stats:', JSON.stringify(statsResult, null, 2));
  
  process.exit(0);
}

debugStats();
