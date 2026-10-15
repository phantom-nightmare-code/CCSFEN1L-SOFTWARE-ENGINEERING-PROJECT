const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.MYSQL_HOST || 'localhost',
  port:     Number(process.env.MYSQL_PORT) || 3306,
  user:     process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'fitforge',
  waitForConnections: true,
  // ZevCloud free tier caps at 10 concurrent connections.
  // Keep this well below the limit to leave headroom.
  connectionLimit: 4,
  maxIdle: 2,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  dateStrings: true,
  multipleStatements: false,
  ssl: process.env.MYSQL_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
});

module.exports = pool;
