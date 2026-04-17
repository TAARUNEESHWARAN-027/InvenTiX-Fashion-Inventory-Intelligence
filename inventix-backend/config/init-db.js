import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client({ connectionString: process.env.DATABASE_URL });

client.connect().then(() => {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  return client.query(sql);
}).then(() => {
  console.log('Schema applied successfully');
  process.exit(0);
}).catch(e => {
  console.error('Error applying schema:', e);
  process.exit(1);
});
