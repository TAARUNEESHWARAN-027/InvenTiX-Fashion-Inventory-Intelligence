import pkg from 'pg';
const { Pool } = pkg;
const p = new Pool({ connectionString: 'postgresql://neondb_owner:npg_8u5NdXxVEzMH@ep-nameless-resonance-anir5zmo.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require' });

// Link demo user to Surat Kurti House
const r1 = await p.query(`UPDATE users SET entity_id='940418c6-a58e-4339-b902-281d6b0c2b2e' WHERE email='demo@inventix.com' RETURNING email, entity_id`);
console.log('Seller linked:', r1.rows);

// Create admin
const r2 = await p.query(`
  INSERT INTO users (email, password_hash, role)
  VALUES ('admin@inventix.com', crypt('admin123', gen_salt('bf')), 'admin')
  ON CONFLICT (email) DO UPDATE SET role='admin'
  RETURNING email, role
`).catch(e => { console.log('admin insert err:', e.message); return { rows: [] }; });
console.log('Admin:', r2.rows);

// Seller linked to Tirupur Basics
const r3 = await p.query(`
  INSERT INTO users (email, password_hash, role, entity_id)
  VALUES ('seller@inventix.com', crypt('password123', gen_salt('bf')), 'manufacturer', 'd8e337b1-92c2-4113-beea-dc5f98a48585')
  ON CONFLICT (email) DO UPDATE SET entity_id='d8e337b1-92c2-4113-beea-dc5f98a48585', role='manufacturer'
  RETURNING email, entity_id
`).catch(e => { console.log('seller insert err:', e.message); return { rows: [] }; });
console.log('Seller@:', r3.rows);

p.end();
