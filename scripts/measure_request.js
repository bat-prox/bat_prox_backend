const fetch = global.fetch || require('node-fetch');

async function run() {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  const phone = `999${Date.now().toString().slice(-7)}`;
  const password = 'TestPass123!';

  try {
    console.log('Registering test user...');
    const regRes = await fetch(`${base}/user/create_user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'PerfTester', phone, password })
    });
    const regJson = await regRes.json();
    if (!regRes.ok) {
      console.error('Register failed', regRes.status, regJson);
      process.exit(1);
    }

    const token = regJson.token;
    console.log('Got access token. Now measuring /user/all_users');

    const t0 = Date.now();
    const res = await fetch(`${base}/user/all_users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const t1 = Date.now();

    const dt = t1 - t0;
    const body = await res.text();

    console.log(`Status: ${res.status}  Time: ${dt}ms`);
    console.log('Response preview:', body.substring(0, 500));

    process.exit(0);
  } catch (err) {
    console.error('Error during measurement:', err);
    process.exit(1);
  }
}

run();
