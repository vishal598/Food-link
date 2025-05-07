// Script to check if donations table is empty
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./foodlink.db');

console.log('Checking donations in the database...');

// Get all donations
db.all("SELECT id, donorName, donor, trackingId FROM donations", (err, rows) => {
  if (err) {
    console.error('Error querying donations:', err);
    db.close();
    return;
  }
  
  console.log(`Found ${rows.length} donations in the database`);
  
  // Log details for each donation
  rows.forEach(row => {
    console.log(`Donation #${row.id}:`);
    console.log(`  - donorName: "${row.donorName}" (type: ${typeof row.donorName})`);
    console.log(`  - donor: "${row.donor}" (type: ${typeof row.donor})`);
    console.log(`  - trackingId: "${row.trackingId}"`);
    
    if (row.donorName && typeof row.donorName === 'string' && row.donorName.includes(',')) {
      console.log(`  ⚠️ WARNING: donorName appears to be an array stored as a string: ${row.donorName}`);
    }
    
    if (row.donor && typeof row.donor === 'string' && row.donor.includes(',')) {
      console.log(`  ⚠️ WARNING: donor appears to be an array stored as a string: ${row.donor}`);
    }
  });
  
  // Close database connection
  db.close(() => {
    console.log('Database connection closed');
  });
}); 