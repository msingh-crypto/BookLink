const { Pool } = require("pg");
require("dotenv").config();

const isTestEnv = process.env.NODE_ENV === "test";

// Fallback database connection string for Jest/CI test runner
const defaultTestDbUrl =
  "postgresql://postgres:postgres@localhost:5432/postgres";

const connectionString =
  process.env.DATABASE_URL || (isTestEnv ? defaultTestDbUrl : null);

let poolConfig = {};

if (connectionString) {
  poolConfig = {
    connectionString,
    // Disable SSL in test environments or CI runners
    ...(isTestEnv ? {} : { ssl: { rejectUnauthorized: false } }),
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "postgres",
  };
}

const pool = new Pool(poolConfig);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
