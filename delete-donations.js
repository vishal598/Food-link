// Script to delete all donations from the database
const sqlite3 = require('sqlite3').verbose();

// Open the database
const db = new sqlite3.Database('./foodlink.db');

// Delete all records from the donations table
db.run('DELETE FROM donations', function(err) {
  if (err) {
    console.error('Error deleting donations:', err.message);
  } else {
    console.log(`All donations deleted. Rows affected: ${this.changes}`);
  }
  
  // Also delete tracking status records
  db.run('DELETE FROM tracking_status', function(err) {
    if (err) {
      console.error('Error deleting tracking status records:', err.message);
    } else {
      console.log(`All tracking status records deleted. Rows affected: ${this.changes}`);
    }
    
    // Close the database connection
    db.close();
  });
}); 