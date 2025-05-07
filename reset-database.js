const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./foodlink.db');

console.log('Starting database reset process...');

// Function to safely execute SQL
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error(`Error executing SQL: ${sql}`, err);
        reject(err);
      } else {
        console.log(`Successfully executed: ${sql}`);
        console.log(`Affected rows: ${this.changes}`);
        resolve(this);
      }
    });
  });
}

// Main reset function
async function resetDatabase() {
  try {
    // Begin transaction
    await runQuery('BEGIN TRANSACTION');
    
    // 1. Delete all records from tracking_status
    await runQuery('DELETE FROM tracking_status');
    
    // 2. Delete all records from donation_requests
    await runQuery('DELETE FROM donation_requests');
    
    // 3. Delete all records from donations
    await runQuery('DELETE FROM donations');
    
    // 4. Delete all records from users
    await runQuery('DELETE FROM users');
    
    // Commit transaction
    await runQuery('COMMIT');
    
    console.log('✅ Database reset complete! All donations and users have been removed.');
    
    // Count records in all tables to verify
    console.log('\nVerification:');
    const tables = ['users', 'donations', 'tracking_status', 'donation_requests'];
    
    for (const table of tables) {
      db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
        if (err) {
          console.error(`Error counting records in ${table}:`, err);
        } else {
          console.log(`${table}: ${row.count} records`);
        }
      });
    }
    
  } catch (error) {
    // Rollback on error
    console.error('❌ Error during database reset:', error);
    await runQuery('ROLLBACK');
  } finally {
    // Close database connection after a delay to allow the verification queries to complete
    setTimeout(() => {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed.');
        }
      });
    }, 1000);
  }
}

// Run the reset function
resetDatabase(); 