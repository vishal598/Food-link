const http = require('http');

const loginData = {
  email: 'test3@example.com',
  password: 'testpass123'
};

const postData = new URLSearchParams(loginData).toString();

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Sending login request...');
console.log('Login data:', { email: loginData.email });

const req = http.request(options, (res) => {
  console.log('Response status:', res.statusCode);
  console.log('Response headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response body:', data);
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
  process.exit(1);
});

req.write(postData);
req.end(); 