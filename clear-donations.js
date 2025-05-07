// Script to clear all donations and tracking data
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./foodlink.db');

console.log('Starting database cleanup...');

// First delete all tracking status records
db.run('DELETE FROM tracking_status', function(err) {
  if (err) {
    console.error('Error clearing tracking status records:', err.message);
    db.close();
    return;
  }
  
  console.log(`Cleared ${this.changes} tracking status records`);
  
  // Then delete all donations
  db.run('DELETE FROM donations', function(err) {
    if (err) {
      console.error('Error clearing donations:', err.message);
      db.close();
      return;
    }
    
    console.log(`Cleared ${this.changes} donations`);
    
    // Verify the tables are empty
    db.get('SELECT COUNT(*) as count FROM donations', (err, result) => {
      if (err) {
        console.error('Error checking donations count:', err.message);
      } else {
        console.log(`Donations table now has ${result.count} records`);
      }
      
      db.get('SELECT COUNT(*) as count FROM tracking_status', (err, result) => {
        if (err) {
          console.error('Error checking tracking status count:', err.message);
        } else {
          console.log(`Tracking status table now has ${result.count} records`);
        }
        
        console.log('Database cleanup complete!');
        db.close();
      });
    });
  });
}); 