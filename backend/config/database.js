const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_smarternak',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

console.log('Database configuration:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  connectionLimit: dbConfig.connectionLimit
});

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Register pool error handler
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    
    // Check what database we're connected to
    const [rows] = await connection.execute('SELECT DATABASE() as db');
    console.log(`✅ Connected to database: ${rows[0].db}`);
    
    // List tables in database
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Available tables:', tables.map(t => Object.values(t)[0]).join(', '));
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error(`Database '${dbConfig.database}' does not exist. Please create it first.`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`Could not connect to MySQL at ${dbConfig.host}:${dbConfig.port}. Make sure MySQL is running.`);
    }
    return false;
  }
};

// Execute query with error handling
const executeQuery = async (query, params = []) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('Executing query:', query.replace(/\s+/g, ' ').trim());
    if (params.length > 0) {
      console.log('Query parameters:', params);
      console.log('Parameter types:', params.map(p => typeof p));
    }
    
    // Validate parameter types and convert if needed
    const processedParams = params.map(param => {
      if (param === null || param === undefined) {
        return null;
      }
      // Convert string numbers to actual numbers for MySQL
      if (typeof param === 'string' && !isNaN(param) && param.trim() !== '') {
        return Number(param);
      }
      return param;
    });
    
    console.log('Processed parameters:', processedParams);
    
    const [rows, fields] = await connection.execute(query, processedParams);
    
    // Log row count for SELECT queries
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      console.log(`Query returned ${rows.length} rows`);
    }
    
    // For INSERT queries, return insertId
    if (rows.insertId !== undefined) {
      return { 
        success: true, 
        data: rows, 
        insertId: rows.insertId,
        affectedRows: rows.affectedRows 
      };
    }
    
    // For SELECT queries, return rows
    return { success: true, data: rows };
  } catch (error) {
    console.error('Database query error:', error.message);
    console.error('Query:', query);
    console.error('Parameters:', params);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('Table does not exist. Please check your database setup.');
    }
    return { success: false, error: error.message };
  } finally {
    if (connection) connection.release();
  }
};

// Execute transaction
const executeTransaction = async (queries) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      console.log('Transaction query:', query.replace(/\s+/g, ' ').trim());
      if (params.length > 0) {
        console.log('Transaction parameters:', params);
      }
      
      const [rows] = await connection.execute(query, params);
      results.push(rows);
    }
    
    await connection.commit();
    return { success: true, data: results };
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Transaction error:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction
}; 