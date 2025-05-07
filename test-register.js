const http = require('http');

const testUser = {
  username: 'testuser3',
  email: 'test3@example.com',
  password: 'testpass123',
  confirmPassword: 'testpass123'
};

const postData = new URLSearchParams(testUser).toString();

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Sending registration request...');
console.log('Test user data:', testUser);

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