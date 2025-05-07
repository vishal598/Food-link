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

// Check users table
db.all("SELECT COUNT(*) as count FROM users", (err, result) => {
  if (err) {
    console.error('Error checking users table:', err);
  } else {
    console.log('Number of users in database:', result[0].count);
  }

  // Check auto-increment value
  db.get("SELECT seq FROM sqlite_sequence WHERE name='users'", (err, row) => {
    if (err) {
      console.error('Error checking auto-increment:', err);
    } else {
      console.log('Users table auto-increment value:', row ? row.seq : 0);
    }

    console.log('Verification complete');
    db.close();
  });
}); 