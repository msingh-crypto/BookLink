const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function initDb() {
  try {
    const schemaPath = path.resolve(__dirname, "../../schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    console.log("Applying schema.sql to PostgreSQL database...");
    await pool.query(schemaSql);
    console.log("Database schema applied successfully.");
  } catch (error) {
    console.error("Failed to initialize database schema:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();
