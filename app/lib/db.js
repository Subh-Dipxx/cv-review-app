import mysql from "mysql2/promise";

// Safer connection configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "asdfghjkl",
  database: process.env.DB_NAME || "cv_review",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create pool more safely
let pool;
try {
  pool = mysql.createPool(dbConfig);
  console.log("MySQL pool created successfully");
} catch (err) {
  console.error("Failed to create MySQL pool:", err);
  // Create a dummy pool that will throw clear errors if used
  pool = {
    getConnection: () =>
      Promise.reject(new Error("Database connection failed: " + err.message)),
    query: () =>
      Promise.reject(new Error("Database connection failed: " + err.message)),
  };
}

export default pool;