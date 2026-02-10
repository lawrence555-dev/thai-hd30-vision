
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Error: DATABASE_URL is not defined in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
});

async function runMigration() {
    try {
        await client.connect();
        console.log('Connected to Supabase PostgreSQL');

        const sql = `
      ALTER TABLE stocks 
      ADD COLUMN IF NOT EXISTS current_yield numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS avg_yield_5y numeric DEFAULT 0;
    `;

        console.log('Running migration to add yield columns...');
        await client.query(sql);
        console.log('Migration successful!');

    } catch (err) {
        console.error('Error executing migration:', err);
    } finally {
        await client.end();
    }
}

runMigration();
