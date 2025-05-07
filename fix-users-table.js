const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./foodlink.db');

console.log('Checking users table structure...');

// Check the structure of the users table
db.all("PRAGMA table_info(users)", (err, columns) => {
  if (err) {
    console.error('Error checking users table structure:', err);
    db.close();
    return;
  }
  
  const columnNames = columns.map(col => col.name);
  console.log('Columns in users table:', columnNames);
  
  // Check if username column exists
  if (!columnNames.includes('username')) {
    console.log('Adding missing username column to users table...');
    
    db.run('ALTER TABLE users ADD COLUMN username TEXT', (err) => {
      if (err) {
        console.error('Error adding username column:', err);
      } else {
        console.log('Successfully added username column to users table');
      }
      
      // Close the database connection
      db.close(() => {
        console.log('Database connection closed');
      });
    });
  } else {
    console.log('Username column already exists in users table');
    
    // Close the database connection
    db.close(() => {
      console.log('Database connection closed');
    });
  }
}); 