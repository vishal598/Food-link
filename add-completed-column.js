// Script to add 'completed' column to donations table
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./foodlink.db');

// Check if the column exists first
db.all("PRAGMA table_info(donations)", (err, columns) => {
  if (err) {
    console.error('Error checking donations table schema:', err.message);
    db.close();
    return;
  }
  
  const columnNames = columns.map(col => col.name);
  console.log('Current columns in donations table:', columnNames);
  
  if (!columnNames.includes('completed')) {
    console.log('Adding completed column to donations table...');
    
    // Add the completed column with default value 0 (not completed)
    db.run('ALTER TABLE donations ADD COLUMN completed INTEGER DEFAULT 0', (err) => {
      if (err) {
        console.error('Error adding completed column:', err.message);
      } else {
        console.log('Successfully added completed column to donations table');
        
        // Verify the column was added
        db.all("PRAGMA table_info(donations)", (err, updatedColumns) => {
          if (err) {
            console.error('Error verifying columns:', err.message);
          } else {
            console.log('Updated columns in donations table:', updatedColumns.map(col => col.name));
          }
          db.close();
        });
      }
    });
  } else {
    console.log('completed column already exists in donations table');
    db.close();
  }
}); 