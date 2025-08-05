import mysql from "mysql2/promise";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "asdfghjkl",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  charset: "utf8mb4",
};

let pool;

const initializeDatabase = async () => {
  try {
    // Create connection without database first
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    // Create database if it doesn't exist
    await tempConnection.query(
      `CREATE DATABASE IF NOT EXISTS cv_review CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await tempConnection.end();

    // Now create pool with database
    pool = mysql.createPool({
      ...dbConfig,
      database: "cv_review",
    });

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    // Create pool anyway for graceful degradation
    pool = mysql.createPool({
      ...dbConfig,
      database: "cv_review",
    });
  }
};

// Initialize database on module load
initializeDatabase();

export default pool;