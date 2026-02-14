const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Error: DATABASE_URL missing in .env.local');
    process.exit(1);
}

async function runMigration() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase/Render/Heroku usually
    });

    try {
        await client.connect();
        console.log('Connected to Supabase via Postgres...');

        const sqlPath = path.join(__dirname, '../supabase/migrations/04_market_summary.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration: 04_market_summary.sql');
        await client.query(sql);
        console.log('Migration completed successfully!');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
