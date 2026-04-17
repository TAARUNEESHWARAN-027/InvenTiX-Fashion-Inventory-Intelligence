

const API = 'http://localhost:5000/api';
const ML = 'http://localhost:8000';

async function run() {
  console.log('Testing End-to-End...');
  try {
    const health = await fetch(`${API}/health`).then(r => r.json());
    console.log('Backend Health:', health);

    const mlHealth = await fetch(`${ML}/health`).then(r => r.json());
    console.log('ML Health:', mlHealth);

    const login = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'seller@inventix.com', password: 'password123' }) // assuming seeded
    });
    
    if (!login.ok) {
       console.log('Login failed (likely need to register). Registering...');
       const reg = await fetch(`${API}/auth/register`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: 'test_seller@inventix.com', password: 'password123', role: 'manufacturer' })
       });
       console.log('Register:', await reg.json());
       return;
    }
    const { token, user } = await login.json();
    console.log('Logged in as:', user.email);

    const inv = await fetch(`${API}/inventory`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());
    console.log(`Fetched ${inv.length} SKUs`);

    const ret = await fetch(`${API}/retailers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());
    console.log(`Fetched ${ret.length} Retailers`);

  } catch(e) {
    console.error('Test failed:', e);
  }
}
run();
