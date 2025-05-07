// Script to test tracking ID generation
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./foodlink.db');

// Function to generate a tracking ID (copied from server.js)
function generateTrackingId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const prefix = 'FL';
  let result = prefix;
  
  // Generate 8 random characters
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

// Create a test donation
const trackingId = generateTrackingId();
console.log('Generated tracking ID:', trackingId);

// Sample donation data
const donationData = {
  donorName: 'Test Donor',
  item: 'Test Food Item',
  quantity: 5,
  address: '123 Test Street',
  foodQuality: 'Good',
  donatedFor: 'Anyone in need',
  type: 'food',
  title: 'Test Donation',
  description: 'This is a test donation',
  date: new Date().toISOString(),
  location: 'Test Location',
  donor: 'Test Donor',
  image: null,
  trackingId: trackingId
};

// Insert into donations table
db.run(
  `INSERT INTO donations 
   (donorName, item, quantity, address, foodQuality, donatedFor, type, title, description, date, location, donor, image, trackingId) 
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    donationData.donorName, 
    donationData.item, 
    donationData.quantity, 
    donationData.address, 
    donationData.foodQuality, 
    donationData.donatedFor,
    donationData.type,
    donationData.title,
    donationData.description,
    donationData.date,
    donationData.location,
    donationData.donor,
    donationData.image,
    donationData.trackingId
  ],
  function(err) {
    if (err) {
      console.error('Error inserting donation:', err);
      db.close();
      return;
    }
    
    console.log(`Donation inserted with ID: ${this.lastID}`);
    
    // Create initial tracking status (Order Requested)
    db.run(
      `INSERT INTO tracking_status 
       (trackingId, status, timestamp, notes, updatedBy) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        donationData.trackingId,
        'Order Requested',
        new Date().toISOString(),
        'Test donation submitted',
        donationData.donorName
      ],
      function(err) {
        if (err) {
          console.error('Error inserting tracking status:', err);
        } else {
          console.log(`Tracking status created for ID: ${donationData.trackingId}`);
        }
        
        // Verify that the donation was inserted with the tracking ID
        db.get('SELECT * FROM donations WHERE trackingId = ?', [trackingId], (err, row) => {
          if (err) {
            console.error('Error verifying donation:', err);
          } else {
            console.log('Inserted donation:', row);
          }
          
          // Check tracking status
          db.all('SELECT * FROM tracking_status WHERE trackingId = ?', [trackingId], (err, rows) => {
            if (err) {
              console.error('Error verifying tracking status:', err);
            } else {
              console.log('Tracking status entries:', rows);
            }
            
            db.close();
          });
        });
      }
    );
  }
); 