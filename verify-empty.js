// Script to verify that the donations table is empty
const sqlite3 = require('sqlite3').verbose();

// Open the database
const db = new sqlite3.Database('./foodlink.db');

// Query the donations table
db.all('SELECT COUNT(*) as count FROM donations', function(err, rows) {
  if (err) {
    console.error('Error querying donations:', err.message);
  } else {
    console.log(`Number of donations in database: ${rows[0].count}`);
  }
  
  // Also check tracking status table
  db.all('SELECT COUNT(*) as count FROM tracking_status', function(err, rows) {
    if (err) {
      console.error('Error querying tracking status:', err.message);
    } else {
      console.log(`Number of tracking status records: ${rows[0].count}`);
    }
    
    // Close the database connection
    db.close();
  });
}); 