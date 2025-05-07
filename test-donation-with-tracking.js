// Script to add a test donation with a tracking ID
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./foodlink.db');

// Generate a tracking ID
function generateTrackingId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const prefix = 'FL';
  let result = prefix;
  
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

// Create test donation data
const trackingId = generateTrackingId();
const testDonation = {
  donorName: 'Test Donor',
  item: 'Special Test Item',
  quantity: 3,
  address: '123 Test St',
  foodQuality: 'Good',
  donatedFor: 'Testing',
  type: 'food',
  title: 'Test Item with Tracking ID',
  description: 'This is a test donation with a guaranteed tracking ID',
  date: new Date().toISOString(),
  location: 'Test Location',
  donor: 'Test Donor',
  image: null,
  trackingId: trackingId
};

console.log('Adding test donation with tracking ID:', trackingId);

// Insert the donation
db.run(
  `INSERT INTO donations 
   (donorName, item, quantity, address, foodQuality, donatedFor, type, title, description, date, location, donor, image, trackingId) 
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    testDonation.donorName,
    testDonation.item,
    testDonation.quantity,
    testDonation.address,
    testDonation.foodQuality,
    testDonation.donatedFor,
    testDonation.type,
    testDonation.title,
    testDonation.description,
    testDonation.date,
    testDonation.location,
    testDonation.donor,
    testDonation.image,
    testDonation.trackingId
  ],
  function(err) {
    if (err) {
      console.error('Error inserting donation:', err);
    } else {
      console.log(`Test donation inserted with ID: ${this.lastID}`);
      
      // Add tracking status entry
      db.run(
        `INSERT INTO tracking_status 
         (trackingId, status, timestamp, notes, updatedBy) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          trackingId,
          'Order Requested',
          new Date().toISOString(),
          'Test donation with guaranteed tracking ID',
          'Test Script'
        ],
        function(err) {
          if (err) {
            console.error('Error inserting tracking status:', err);
          } else {
            console.log('Tracking status entry added');
          }
          
          // Verify the donation was added with tracking ID
          db.get('SELECT * FROM donations WHERE trackingId = ?', [trackingId], (err, row) => {
            if (err) {
              console.error('Error verifying donation:', err);
            } else if (row) {
              console.log('Verified donation with tracking ID exists:', row.id, row.trackingId);
            } else {
              console.log('Failed to find donation with tracking ID:', trackingId);
            }
            
            db.close();
          });
        }
      );
    }
  }
); 