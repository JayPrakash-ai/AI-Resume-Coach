const { Pool } = require("pg");

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "ai_resume_coach",
    password: "Jay@Postgres2026",
    port: 5432,
})

module.exports = pool;