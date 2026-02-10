
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Error: DATABASE_URL is not defined in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
});

async function runSchema() {
    try {
        await client.connect();
        console.log('Connected to Supabase PostgreSQL');

        const schemaPath = path.join(__dirname, '../supabase/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema.sql...');
        await client.query(schemaSql);
        console.log('Schema applied successfully!');

    } catch (err) {
        console.error('Error executing schema:', err);
    } finally {
        await client.end();
    }
}

runSchema();
