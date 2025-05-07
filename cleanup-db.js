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

// Function to clean a table
function cleanTable(tableName) {
  return new Promise((resolve, reject) => {
    // First count records
    db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, result) => {
      if (err) {
        console.error(`Error counting ${tableName}:`, err);
        return reject(err);
      }

      console.log(`Current records in ${tableName}: ${result.count}`);

      // Delete all records
      db.run(`DELETE FROM ${tableName}`, function(err) {
        if (err) {
          console.error(`Error cleaning ${tableName}:`, err);
          return reject(err);
        }

        console.log(`Deleted ${this.changes} records from ${tableName}`);

        // Reset auto-increment
        db.run(`DELETE FROM sqlite_sequence WHERE name='${tableName}'`, (err) => {
          if (err) {
            console.error(`Error resetting ${tableName} auto-increment:`, err);
            return reject(err);
          }

          console.log(`Reset ${tableName} auto-increment counter`);
          resolve();
        });
      });
    });
  });
}

// Clean all tables
async function cleanDatabase() {
  try {
    // Clean tables in order (to avoid foreign key constraints)
    await cleanTable('tracking_status');
    await cleanTable('donation_requests');
    await cleanTable('donations');
    await cleanTable('users');

    console.log('Database cleanup complete');
    db.close();
  } catch (error) {
    console.error('Error during cleanup:', error);
    db.close();
    process.exit(1);
  }
}

// Start cleanup
cleanDatabase(); 