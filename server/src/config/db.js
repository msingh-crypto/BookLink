const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const isTestEnv = process.env.NODE_ENV === "test";

let poolConfig = {};

if (connectionString) {
  poolConfig = {
    connectionString,
    ...(isTestEnv ? {} : { ssl: { rejectUnauthorized: false } }),
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "postgres",
  };
}

const pool = new Pool(poolConfig);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
