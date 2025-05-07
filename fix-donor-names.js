const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./foodlink.db');

console.log('Checking and fixing donor names in the donations table...');

// Get all donations
db.all("SELECT id, donorName, donor FROM donations", (err, rows) => {
  if (err) {
    console.error('Error querying donations:', err);
    db.close();
    return;
  }
  
  console.log(`Found ${rows.length} donations to check`);
  
  let fixedCount = 0;
  let processedCount = 0;
  
  // Process each donation
  rows.forEach(row => {
    let needsFix = false;
    let fixedDonorName = row.donorName;
    let fixedDonor = row.donor;
    
    // Check if donorName is an array (stored as string)
    if (row.donorName && row.donorName.includes(',')) {
      try {
        // This is a simplified check - it's not perfect but should catch most cases
        if (row.donorName.startsWith('[') || row.donorName.includes(',')) {
          // Extract the first element if it looks like an array
          const match = row.donorName.match(/[\'\"]([^\'\"]+)[\'\"]/);
          if (match && match[1]) {
            fixedDonorName = match[1];
            needsFix = true;
            console.log(`Donation ${row.id}: Converting donorName from "${row.donorName}" to "${fixedDonorName}"`);
          }
        }
      } catch (parseError) {
        console.error(`Error parsing donorName for donation ${row.id}:`, parseError);
      }
    }
    
    // Check if donor is an array (stored as string)
    if (row.donor && row.donor.includes(',')) {
      try {
        // This is a simplified check - it's not perfect but should catch most cases
        if (row.donor.startsWith('[') || row.donor.includes(',')) {
          // Extract the first element if it looks like an array
          const match = row.donor.match(/[\'\"]([^\'\"]+)[\'\"]/);
          if (match && match[1]) {
            fixedDonor = match[1];
            needsFix = true;
            console.log(`Donation ${row.id}: Converting donor from "${row.donor}" to "${fixedDonor}"`);
          }
        }
      } catch (parseError) {
        console.error(`Error parsing donor for donation ${row.id}:`, parseError);
      }
    }
    
    // Update the donation if needed
    if (needsFix) {
      db.run(
        'UPDATE donations SET donorName = ?, donor = ? WHERE id = ?',
        [fixedDonorName, fixedDonor, row.id],
        function(err) {
          processedCount++;
          
          if (err) {
            console.error(`Error updating donation ${row.id}:`, err);
          } else {
            fixedCount++;
            console.log(`Successfully fixed donation ${row.id}`);
          }
          
          // Close the database when all updates are complete
          if (processedCount === rows.length) {
            console.log(`Completed fixing donor names. Fixed ${fixedCount} out of ${rows.length} donations.`);
            db.close(() => {
              console.log('Database connection closed');
            });
          }
        }
      );
    } else {
      processedCount++;
      
      // Close the database when all updates are complete
      if (processedCount === rows.length) {
        console.log(`Completed fixing donor names. Fixed ${fixedCount} out of ${rows.length} donations.`);
        db.close(() => {
          console.log('Database connection closed');
        });
      }
    }
  });
  
  // If no donations found, close the database
  if (rows.length === 0) {
    console.log('No donations found to fix.');
    db.close(() => {
      console.log('Database connection closed');
    });
  }
}); 