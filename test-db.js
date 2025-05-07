const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve('./foodlink.db');

console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

// First check if the users table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
  if (err) {
    console.error('Error checking for users table:', err);
    db.close();
    process.exit(1);
  }

  if (!row) {
    console.log('Users table does not exist!');
    db.close();
    process.exit(1);
  }

  console.log('Users table exists, checking for testuser3...');

  // Now check for the test user
  db.get("SELECT username, email FROM users WHERE username = 'testuser3'", (err, row) => {
    if (err) {
      console.error('Error querying for testuser3:', err);
      db.close();
      process.exit(1);
    }
    
    if (row) {
      console.log('Found user:', row);
    } else {
      console.log('User testuser3 not found in database');
    }
    
    db.close();
  });
}); 