import mysql from "mysql2/promise";

// Create connection pool with better error handling
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "cv_review",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Add timeout settings to prevent hanging
  connectTimeout: 10000,
  // Try to handle connection issues
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// Function to test database connection
export async function testDatabaseConnection() {
  let connection;
  try {
    // Add a timeout to prevent hanging
    const connectionPromise = pool.getConnection();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout")), 5000)
    );

    connection = await Promise.race([connectionPromise, timeoutPromise]);
    console.log("Database connection successful");

    // Test query to verify full functionality
    await connection.query("SELECT 1");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error.message);
    return false;
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error("Error releasing connection:", releaseError.message);
      }
    }
  }
}

export default pool;