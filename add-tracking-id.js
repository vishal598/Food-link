// Script to add trackingId column to donations table
const sqlite3 = require('sqlite3').verbose();

// Open the database
const db = new sqlite3.Database('./foodlink.db');

// First check if tracking_status table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='tracking_status'", (err, result) => {
  if (err) {
    console.error('Error checking for tracking_status table:', err.message);
    db.close();
    return;
  }
  
  // Create tracking_status table if it doesn't exist
  if (!result) {
    console.log('Creating tracking_status table...');
    db.run(`
      CREATE TABLE tracking_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trackingId TEXT,
        status TEXT,
        timestamp TEXT,
        notes TEXT,
        updatedBy TEXT,
        FOREIGN KEY(trackingId) REFERENCES donations(trackingId)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating tracking_status table:', err.message);
      } else {
        console.log('Tracking status table created successfully');
      }
    });
  } else {
    console.log('Tracking status table already exists');
  }
  
  // Check if trackingId column exists in donations table
  db.all("PRAGMA table_info(donations)", (err, columns) => {
    if (err) {
      console.error('Error checking donations table columns:', err.message);
      db.close();
      return;
    }
    
    const columnNames = columns.map(col => col.name);
    console.log('Current columns in donations table:', columnNames);
    
    if (!columnNames.includes('trackingId')) {
      console.log('Adding trackingId column to donations table...');
      
      // In SQLite, we need to create a new table with all columns including trackingId
      db.exec(`
        -- Create temporary table with all columns including the new trackingId
        CREATE TABLE donations_temp (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          donorName TEXT,
          item TEXT,
          quantity INTEGER,
          address TEXT,
          foodQuality TEXT,
          donatedFor TEXT,
          type TEXT,
          title TEXT,
          description TEXT,
          date TEXT,
          location TEXT,
          donor TEXT,
          image TEXT,
          trackingId TEXT UNIQUE
        );
        
        -- Copy data from original table to temporary table
        INSERT INTO donations_temp 
          (id, donorName, item, quantity, address, foodQuality, donatedFor, type, title, description, date, location, donor, image)
        SELECT 
          id, donorName, item, quantity, address, foodQuality, donatedFor, type, title, description, date, location, donor, image 
        FROM donations;
        
        -- Drop the original table
        DROP TABLE donations;
        
        -- Rename the temporary table to the original name
        ALTER TABLE donations_temp RENAME TO donations;
      `, (err) => {
        if (err) {
          console.error('Error adding trackingId column:', err.message);
        } else {
          console.log('Added trackingId column with UNIQUE constraint to donations table');
          
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
      console.log('trackingId column already exists in donations table');
      db.close();
    }
  });
}); 