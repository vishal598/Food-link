const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./foodlink.db');

console.log('Fixing [object Object] donor names in the database...');

// First let's check if there are any donations with [object Object] as donor name
db.all("SELECT id, donorName, donor, trackingId FROM donations WHERE donorName LIKE '%[object Object]%'", (err, rows) => {
  if (err) {
    console.error('Error querying donations:', err);
    db.close();
    return;
  }
  
  console.log(`Found ${rows.length} donations with [object Object] as donorName`);
  
  if (rows.length === 0) {
    // Check regular table users and find the username for the tracking ID
    db.all("SELECT d.id, d.trackingId, u.username FROM donations d, users u WHERE d.donorName LIKE '%[object Object]%' OR d.donor LIKE '%[object Object]%'", (err, rows) => {
      if (err) {
        console.error('Error in second query:', err);
        db.close();
        return;
      }
      
      console.log('No direct matches found. Attempting to fix based on user sessions...');
      
      // If no donations found with the exact match, let's check the most recent user
      db.get("SELECT username FROM users ORDER BY id DESC LIMIT 1", (err, user) => {
        if (err || !user) {
          console.error('Error getting most recent user:', err);
          db.close();
          return;
        }
        
        const username = user.username;
        console.log(`Using most recent username: ${username}`);
        
        // Update all donations with [object Object] to use this username
        db.run(
          "UPDATE donations SET donorName = ?, donor = ? WHERE donorName LIKE '%[object Object]%' OR donor LIKE '%[object Object]%'",
          [username, username],
          function(err) {
            if (err) {
              console.error('Error updating donations:', err);
            } else {
              console.log(`Updated ${this.changes} donations with username: ${username}`);
            }
            
            db.close(() => {
              console.log('Database connection closed');
            });
          }
        );
      });
    });
  } else {
    // Update one by one with a specific fix
    let processedCount = 0;
    
    rows.forEach(row => {
      console.log(`Fixing donation #${row.id} with trackingId ${row.trackingId}`);
      
      // Get the username from the users table based on the most recent user
      db.get("SELECT username FROM users ORDER BY id DESC LIMIT 1", (err, user) => {
        if (err) {
          console.error(`Error getting user for donation #${row.id}:`, err);
          processedCount++;
          checkCompletion();
          return;
        }
        
        const username = user ? user.username : 'donor';
        console.log(`Setting donor name for donation #${row.id} to "${username}"`);
        
        // Update the donation
        db.run(
          'UPDATE donations SET donorName = ?, donor = ? WHERE id = ?',
          [username, username, row.id],
          function(err) {
            processedCount++;
            
            if (err) {
              console.error(`Error updating donation #${row.id}:`, err);
            } else {
              console.log(`Successfully fixed donation #${row.id}`);
            }
            
            checkCompletion();
          }
        );
      });
    });
    
    function checkCompletion() {
      if (processedCount === rows.length) {
        console.log(`Completed fixing donor names.`);
        db.close(() => {
          console.log('Database connection closed');
        });
      }
    }
  }
}); 