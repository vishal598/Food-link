const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const db = new sqlite3.Database('./foodlink.db');

// Configure nodemailer for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',  // Change this to your email service
  auth: {
    user: 'your-email@gmail.com',  // Replace with your email
    pass: 'your-app-password'      // Replace with your app password
  }
});

// Function to send email
async function sendEmail(to, subject, htmlContent) {
  console.log('Attempting to send email to:', to);
  console.log('Email subject:', subject);
  
  try {
    // Skip actual sending in development mode if configuration is missing
    if (transporter.options.auth.user === 'your-email@gmail.com') {
      console.log('DEVELOPMENT MODE: Email sending skipped (using placeholder credentials)');
      console.log('To enable email sending, update the email configuration in the server code');
      console.log('Email would have been sent to:', to);
      // Return true to simulate successful sending in development
      return true;
    }
    
    // Email options
    const mailOptions = {
      from: 'FoodLink <your-email@gmail.com>',  // Replace with your email
      to: to,
      subject: subject,
      html: htmlContent
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    // Log specific error information to help with debugging
    if (error.code === 'EAUTH') {
      console.error('Authentication error: Check your email credentials');
    } else if (error.code === 'ESOCKET') {
      console.error('Socket error: Check your network connection or email service settings');
    }
    return false;
  }
}

// Function to check and log database tables
function checkDatabaseSchema() {
  console.log('Checking database schema...');
  
  // Check for tables
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('Error checking tables:', err);
      return;
    }
    
    const tableNames = tables.map(t => t.name);
    console.log('Tables in database:', tableNames);
    
    // Check for columns in the donations table
    db.all("PRAGMA table_info(donations)", (err, columns) => {
      if (err) {
        console.error('Error checking donations table columns:', err);
        return;
      }
      
      const columnNames = columns.map(col => col.name);
      console.log('Columns in donations table:', columnNames);
      
      // Define expected columns
      const expectedColumns = [
        'id', 'donorName', 'item', 'quantity', 'address', 'foodQuality',
        'donatedFor', 'type', 'title', 'description', 'date', 'location',
        'donor', 'image', 'trackingId'
      ];
      
      // Check for missing columns
      const missingColumns = expectedColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('Missing columns in donations table:', missingColumns);
      } else {
        console.log('All expected columns are present in donations table');
      }
    });
  });
}

// Middleware
app.use(express.static(path.join(__dirname, 'public')));  // Serve static assets from 'public' folder
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// More detailed request logging for debugging
app.use('/api', (req, res, next) => {
  console.log(`API Request: ${req.method} ${req.originalUrl}`, {
    contentType: req.headers['content-type'],
    accept: req.headers['accept'],
    bodySize: req.body ? JSON.stringify(req.body).length : 0,
    body: req.body ? JSON.stringify(req.body).substring(0, 200) : 'empty' // Log part of the body for debugging
  });
  
  // Add response interceptor for debugging
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`API Response for ${req.method} ${req.originalUrl}: Status ${res.statusCode}`, {
      contentType: res.getHeader('content-type'),
      responseSize: data ? data.length : 0,
      responsePreview: typeof data === 'string' ? data.substring(0, 200) : 'non-string data'
    });
    return originalSend.apply(this, arguments);
  };
  
  next();
});

// Handle JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parse Error:', err.message);
    return res.status(400).json({ error: 'Invalid JSON in request body', details: err.message });
  }
  next(err);
});

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'foodlink-secure-session-key-2024',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Create Users Table (if it doesn't exist already)
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    email TEXT UNIQUE,
    password TEXT
  )
`);

// Create Donations Table (if it doesn't exist already)
db.run(`
  CREATE TABLE IF NOT EXISTS donations (
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
  )
`, (err) => {
  if (err) {
    console.error('Error creating donations table:', err);
  } else {
    console.log('Donations table created or already exists');
    // Check database schema after table creation
    checkDatabaseSchema();
    
    // Add missing columns to the donations table if they don't exist
    addMissingColumns();
  }
});

// Create Tracking Status Table
db.run(`
  CREATE TABLE IF NOT EXISTS tracking_status (
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
    console.error('Error creating tracking_status table:', err);
  } else {
    console.log('Tracking status table created or already exists');
  }
});

// Create Donation Requests Table
db.run(`
  CREATE TABLE IF NOT EXISTS donation_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    donationId INTEGER,
    requesterName TEXT,
    requesterEmail TEXT,
    requesterPhone TEXT,
    requesterMessage TEXT,
    requestDate TEXT,
    isApproved INTEGER DEFAULT 0,
    FOREIGN KEY(donationId) REFERENCES donations(id)
  )
`, (err) => {
  if (err) {
    console.error('Error creating donation_requests table:', err);
  } else {
    console.log('Donation requests table created or already exists');
  }
});

// Function to add missing columns to the donations table
function addMissingColumns() {
  // Get existing columns
  db.all("PRAGMA table_info(donations)", (err, columns) => {
    if (err) {
      console.error('Error checking donations table columns:', err);
      return;
    }
    
    // Define columns to check and add if missing
    const columnsToAdd = [
      { name: 'donatedFor', type: 'TEXT' },
      { name: 'type', type: 'TEXT' },
      { name: 'title', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'date', type: 'TEXT' },
      { name: 'location', type: 'TEXT' },
      { name: 'donor', type: 'TEXT' },
      { name: 'image', type: 'TEXT' },
      { name: 'donorEmail', type: 'TEXT' }
    ];
    
    // Filter out columns that already exist
    const existingColumnNames = columns.map(col => col.name);
    const missingColumns = columnsToAdd.filter(col => !existingColumnNames.includes(col.name));
    
    // Check if trackingId column exists
    const hasTrackingId = existingColumnNames.includes('trackingId');
    
    // Add each missing column
    if (missingColumns.length > 0 || !hasTrackingId) {
      console.log(`Adding ${missingColumns.length + (!hasTrackingId ? 1 : 0)} missing columns to donations table...`);
      
      // Process regular columns sequentially using a recursive function
      function addNextColumn(index) {
        if (index >= missingColumns.length) {
          // After adding regular columns, check if we need to add trackingId
          if (!hasTrackingId) {
            console.log('Adding trackingId column...');
            // For SQLite, we need to create a new table with the UNIQUE constraint
            // since ALTER TABLE doesn't support adding UNIQUE columns directly
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
                console.error('Error adding trackingId column:', err);
              } else {
                console.log('Added trackingId column with UNIQUE constraint to donations table');
              }
              
              console.log('All missing columns added successfully');
              
              // Check the schema again to confirm all columns are present
              checkDatabaseSchema();
            });
          } else {
            console.log('All missing columns added successfully');
            
            // Check the schema again to confirm all columns are present
            checkDatabaseSchema();
          }
          return;
        }
        
        const column = missingColumns[index];
        const sql = `ALTER TABLE donations ADD COLUMN ${column.name} ${column.type}`;
        
        db.run(sql, (err) => {
          if (err) {
            console.error(`Error adding column ${column.name}:`, err);
          } else {
            console.log(`Added column ${column.name} to donations table`);
          }
          
          // Process the next column
          addNextColumn(index + 1);
        });
      }
      
      // Start adding columns
      addNextColumn(0);
    } else {
      console.log('No missing columns to add');
      // Check the schema to confirm all columns are present
      checkDatabaseSchema();
    }
  });
}

// Function to generate a unique tracking ID
function generateTrackingId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const prefix = 'FL';
  let result = prefix;
  
  // Generate 8 random characters
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  console.log('Generated tracking ID:', result);
  return result;
}

// Make sure there are no malformed URLs in these routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'page.html'));
});

app.get('/animal', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'animal.html'));
});

app.get('/list', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'list.html'));
});

app.get('/poor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'poor.html'));
});

// Endpoint for login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    // Check if email exists
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        console.error('Login database error:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Database error occurred' 
        });
      }

      if (!row) {
        return res.status(400).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      // Compare the password
      bcrypt.compare(password, row.password, (err, result) => {
        if (err) {
          console.error('Password comparison error:', err);
          return res.status(500).json({ 
            success: false,
            error: 'Error comparing passwords' 
          });
        }

        if (!result) {
          return res.status(400).json({ 
            success: false,
            error: 'Incorrect password' 
          });
        }

        // Create a session for the logged-in user
        req.session.userId = row.id;
        req.session.username = row.username;
        
        // Set a cookie with the username
        res.cookie('username', row.username, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        });
        
        res.json({ 
          success: true, 
          redirect: '/page.html',
          username: row.username 
        });
      });
    });
  } catch (error) {
    console.error('Unexpected error in login:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

// Endpoint for registration
app.post('/register', async (req, res) => {
  console.log('Registration request received with body:', req.body);
  
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    // Log the received data (excluding password)
    console.log('Registration data:', {
      username,
      email,
      passwordLength: password ? password.length : 0,
      confirmPasswordLength: confirmPassword ? confirmPassword.length : 0
    });
    
    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
      console.error('Registration error: Missing required fields');
      return res.status(400).json({ 
        success: false,
        error: 'Please fill in all required fields' 
      });
    }

    // Check if the passwords match
    if (password !== confirmPassword) {
      console.error('Registration error: Passwords do not match');
      return res.status(400).json({ 
        success: false,
        error: 'Passwords do not match' 
      });
    }

    // Check if the email is already taken
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        console.error('Registration database error:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Database error occurred' 
        });
      }

      if (row) {
        console.error('Registration error: Email already registered', email);
        return res.status(400).json({ 
          success: false,
          error: 'Email is already registered' 
        });
      }
      
      // Check if username is taken
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
          console.error('Registration database error (username check):', err);
          return res.status(500).json({ 
            success: false,
            error: 'Database error occurred' 
          });
        }

        if (row) {
          console.error('Registration error: Username already taken', username);
          return res.status(400).json({ 
            success: false,
            error: 'Username is already taken' 
          });
        }

        // Hash the password
        bcrypt.hash(password, 10, (err, hashedPassword) => {
          if (err) {
            console.error('Registration password hashing error:', err);
            return res.status(500).json({ 
              success: false,
              error: 'Error hashing password' 
            });
          }

          console.log('Password hashed successfully');

          // Insert the new user into the database
          db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
            [username, email, hashedPassword], 
            function(err) {
              if (err) {
                console.error('Registration user insertion error:', err);
                return res.status(500).json({ 
                  success: false,
                  error: 'Error saving user' 
                });
              }

              console.log('User registered successfully:', { id: this.lastID, username, email });
              
              // Create a session for the newly registered user
              req.session.userId = this.lastID;
              req.session.username = username;
              
              // Set a cookie with the username
              res.cookie('username', username, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production'
              });
              
              // Send success response
              return res.status(200).json({
                success: true,
                redirect: '/page.html',
                username: username
              });
            }
          );
        });
      });
    });
  } catch (error) {
    console.error('Unexpected error in registration:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

// Endpoint for donation submission
app.post('/donate', (req, res) => {
  console.log('Donation request received');
  
  // Skip authentication check for test form
  const isTestForm = req.headers['referer'] && req.headers['referer'].includes('test-form.html');
  
  // Get user info from session, localStorage cookie, or request body
  const sessionUserId = req.session.userId;
  const sessionUsername = req.session.username;
  const donorName = req.body.donorName;
  const donorEmail = req.body.donorEmail;
  
  console.log('Authentication check:', { 
    sessionUserId,
    sessionUsername,
    donorNameFromForm: donorName,
    donorEmail,
    isTestForm
  });
  
  // Allow donation if any authentication method is present
  if (!sessionUserId && !isTestForm && !donorName) {
    console.log('No authentication found');
    return res.status(401).send('You must be logged in to donate');
  }

  const { item, quantity, address, foodQuality, donatedFor, type, title, description, location, contact, image } = req.body;

  // Convert donorName to string if it's an array
  const processedDonorName = Array.isArray(donorName) ? donorName[0] : donorName;

  console.log('Extracted data from request body:', { 
    donorName, 
    processedDonorName,
    donorEmail, 
    item, 
    quantity, 
    address, 
    foodQuality, 
    donatedFor, 
    type, 
    title, 
    description, 
    location, 
    contact,
    imageReceived: image ? `${image.substring(0, 30)}... (${image.length} chars)` : 'no'
  });

  if (!processedDonorName || !item || !quantity || !address || !donorEmail) {
    console.log('Missing required fields:', { processedDonorName, donorEmail, item, quantity, address });
    return res.status(400).send('Missing required fields');
  }

  console.log('All required fields present, preparing donation data');
  
  // Validate image data if present
  let processedImage = null;
  if (image && typeof image === 'string' && image.trim().length > 0) {
    if (image.startsWith('data:image')) {
      processedImage = image;
      console.log(`Valid image data received (${image.length} chars)`);
    } else {
      console.warn('Image data received but does not appear to be a valid data URL');
    }
  }
  
  // Generate a unique tracking ID
  const trackingId = generateTrackingId();
  
  // Create more complete donation object
  const donationData = {
    donorName: processedDonorName,
    donorEmail,
    item,
    quantity,
    address,
    foodQuality: foodQuality || 'Good',
    donatedFor: donatedFor || 'Anyone in need',
    type: type || 'food',
    title: title || item,
    description: description || `${quantity} units of ${item}`,
    date: new Date().toISOString(),
    location: location || address,
    donor: processedDonorName,
    image: processedImage,
    trackingId
  };

  console.log('Donation data ready for database:', {
    ...donationData,
    image: donationData.image ? `${donationData.image.substring(0, 30)}... (${donationData.image.length} chars)` : 'no image data',
    trackingId: donationData.trackingId
  });

  // Make sure quantity is a number
  let parsedQuantity = parseInt(donationData.quantity, 10);
  if (isNaN(parsedQuantity)) {
    console.log('Invalid quantity value, defaulting to 1');
    parsedQuantity = 1;
  }

  // Insert into donations table
  db.run(
    `INSERT INTO donations 
     (donorName, donorEmail, item, quantity, address, foodQuality, donatedFor, type, title, description, date, location, donor, image, trackingId) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      donationData.donorName,
      donationData.donorEmail,
      donationData.item, 
      parsedQuantity, 
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
        console.error('SQL error code:', err.code);
        console.error('SQL error message:', err.message);
        return res.status(500).send('Database error: ' + err.message);
      }
      
      // Create initial tracking status (Order Requested)
      db.run(
        `INSERT INTO tracking_status 
         (trackingId, status, timestamp, notes, updatedBy) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          donationData.trackingId,
          'Order Requested',
          new Date().toISOString(),
          'Donation submitted',
          donationData.donorName
        ],
        function(err) {
          if (err) {
            console.error('Error inserting tracking status:', err);
            // Don't return an error, as the donation itself was successful
          }
          
          console.log('Donation successfully saved to database with tracking ID:', donationData.trackingId);
          
          // If this is a direct API call, return the tracking ID
          if (req.headers['accept'] === 'application/json') {
            return res.json({ 
              success: true, 
              trackingId: donationData.trackingId,
              message: 'Donation submitted successfully'
            });
          }
          
          // Otherwise redirect with the tracking ID as a query param
          console.log('Redirecting to donation-success with trackingId:', donationData.trackingId);
          res.redirect('/donation-success?trackingId=' + donationData.trackingId);
        }
      );
    }
  );
});

// New endpoint for donation success page
app.get('/donation-success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'donation-success.html'));
});

// New endpoint to update tracking status
app.post('/api/tracking/update', (req, res) => {
  const { trackingId, status, notes, donorName } = req.body;
  
  if (!trackingId || !status) {
    return res.status(400).json({ error: 'Tracking ID and status are required' });
  }
  
  console.log('Tracking update request received:', {
    trackingId,
    status,
    notes,
    donorName
  });
  
  // Validate that the tracking ID exists
  db.get('SELECT * FROM donations WHERE trackingId = ?', [trackingId], (err, donation) => {
    if (err) {
      console.error('Error finding donation:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!donation) {
      return res.status(404).json({ error: 'Invalid tracking ID' });
    }
    
    console.log('Found donation for tracking update:', {
      id: donation.id,
      storedDonorName: donation.donorName,
      providedDonorName: donorName,
      storedDonorType: typeof donation.donorName,
      providedDonorType: typeof donorName
    });
    
    // Get the current user from session or provided donor name
    const currentUser = req.session.username || donorName || '';
    
    // Check if the provided donor name matches the original donor
    // Handle case where donorName might be stored as an array (legacy data)
    let isDonorNameMatch = false;
    
    if (Array.isArray(donation.donorName)) {
      isDonorNameMatch = donation.donorName[0] === donorName;
    } else {
      isDonorNameMatch = donation.donorName === donorName;
    }
    
    // Only allow updates if the donor name matches exactly
    if (!isDonorNameMatch) {
      console.log('Unauthorized update attempt:', { 
        providedDonorName: donorName,
        storedDonorName: donation.donorName,
        trackingId 
      });
      return res.status(403).json({ error: 'Authentication failed. Please provide the exact name used when making the donation.' });
    }
    
    // Log the authorized update
    console.log('Authorized update:', { 
      trackingId, 
      status, 
      isDonorNameMatch
    });
    
    // Validate the status
    const validStatuses = ['Order Requested', 'Facility Reached', 'Picked Up', 'Received'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }
    
    // Get the user making the update
    const updatedBy = req.session.username || donorName || 'Anonymous';
    
    // Insert the tracking status update
    db.run(
      'INSERT INTO tracking_status (trackingId, status, timestamp, notes, updatedBy) VALUES (?, ?, ?, ?, ?)',
      [trackingId, status, new Date().toISOString(), notes || '', updatedBy],
      function(err) {
        if (err) {
          console.error('Error updating tracking status:', err);
          return res.status(500).json({ error: 'Failed to update tracking status' });
        }
        
        // If status is "Received", mark the donation as completed
        if (status === 'Received') {
          db.run(
            'UPDATE donations SET completed = 1 WHERE trackingId = ?',
            [trackingId],
            function(err) {
              if (err) {
                console.error('Error marking donation as completed:', err);
                // Continue with success response even if this fails
              } else {
                console.log(`Donation with tracking ID ${trackingId} marked as completed`);
              }
              
              return res.json({ 
                success: true, 
                message: 'Tracking status updated successfully',
                completed: true
              });
            }
          );
        } else {
          return res.json({ 
            success: true, 
            message: 'Tracking status updated successfully' 
          });
        }
      }
    );
  });
});

// New endpoint to get tracking history
app.get('/api/tracking/:trackingId', (req, res) => {
  const { trackingId } = req.params;
  
  if (!trackingId) {
    return res.status(400).json({ error: 'Tracking ID is required' });
  }
  
  // First, verify the donation exists
  db.get('SELECT * FROM donations WHERE trackingId = ?', [trackingId], (err, donation) => {
    if (err) {
      console.error('Error finding donation:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!donation) {
      return res.status(404).json({ error: 'Invalid tracking ID' });
    }
    
    // Get the tracking history
    db.all(
      'SELECT * FROM tracking_status WHERE trackingId = ? ORDER BY timestamp ASC',
      [trackingId],
      (err, statuses) => {
        if (err) {
          console.error('Error getting tracking history:', err);
          return res.status(500).json({ error: 'Failed to retrieve tracking history' });
        }
        
        res.json({
          donation: {
            id: donation.id,
            title: donation.title,
            item: donation.item,
            quantity: donation.quantity,
            date: donation.date,
            trackingId: donation.trackingId
          },
          history: statuses
        });
      }
    );
  });
});

// New route for the tracking page
app.get('/tracking', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tracking.html'));
});

// New route for the update tracking status page
app.get('/update-tracking', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'update-tracking.html'));
});

// Get current user info
app.get('/api/user', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ isLoggedIn: false });
  }
  
  db.get('SELECT id, username, email FROM users WHERE id = ?', [req.session.userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({
      isLoggedIn: true,
      user: {
        id: row.id,
        username: row.username,
        email: row.email
      }
    });
  });
});

// Get list of donations
app.get('/donations', (req, res) => {
  // Only return donations that are not completed
  db.all('SELECT * FROM donations WHERE completed = 0 OR completed IS NULL', (err, rows) => {
    if (err) {
      console.error('Error fetching donations:', err);
      return res.status(500).json({ error: err.message });
    }

    // Log the image data presence for debugging
    const donationsWithImages = rows.filter(row => row.image).length;
    const donationsWithTrackingIds = rows.filter(row => row.trackingId).length;
    console.log(`Active donations fetched: ${rows.length} (${donationsWithImages} with images, ${donationsWithTrackingIds} with tracking IDs)`);
    
    // For debugging, log the first few characters of each image field that has data
    rows.forEach((row, index) => {
      if (row.image) {
        console.log(`Donation #${row.id} has image data starting with: ${row.image.substring(0, 30)}... (${row.image.length} chars)`);
      }
      
      // Log tracking IDs
      if (row.trackingId) {
        console.log(`Donation #${row.id} has tracking ID: ${row.trackingId}`);
      } else {
        console.log(`Donation #${row.id} is missing tracking ID`);
      }
    });

    res.json(rows);
  });
});

// Logout Endpoint
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Error logging out');
    }
    res.redirect('/login');
  });
});

// Add a middleware to ensure API routes return JSON errors
app.use('/api/*', (err, req, res, next) => {
  console.error('API error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500
  });
});

// Modify the donation request endpoint to ensure consistent JSON responses
app.post('/api/request-donation', (req, res) => {
  try {
    // Check that we have the required fields
    const { donationId, requesterName, requesterEmail, requesterPhone, requesterMessage } = req.body;
    
    console.log('Donation request received:', {
      donationId,
      requesterName,
      requesterEmail,
      requesterPhone,
      messageLength: requesterMessage ? requesterMessage.length : 0
    });
    
    if (!donationId) {
      console.warn('Missing donation ID in request');
      return res.status(400).json({ error: 'Missing donation ID' });
    }
    
    if (!requesterName || !requesterEmail) {
      console.warn('Missing required fields in request:', { 
        hasName: !!requesterName, 
        hasEmail: !!requesterEmail 
      });
      return res.status(400).json({ error: 'Missing required fields: name and email are required' });
    }
    
    // Get donation details from the database
    db.get('SELECT * FROM donations WHERE id = ?', [donationId], async (err, donation) => {
      try {
        if (err) {
          console.error('Database error fetching donation:', err);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        if (!donation) {
          console.warn(`Donation with ID ${donationId} not found`);
          return res.status(404).json({ error: 'Donation not found' });
        }
        
        console.log(`Found donation with ID ${donationId}:`, {
          title: donation.title || donation.item,
          donorName: donation.donorName,
          hasDonorEmail: !!donation.donorEmail
        });
        
        // Get donor's email from the database
        const donorEmail = donation.donorEmail || 'your-email@gmail.com'; // Replace with default admin email
        
        // Create email content
        const emailSubject = `New Request for Your Donation: ${donation.title || donation.item}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4CAF50; text-align: center;">New Donation Request</h2>
            <p>Hello ${donation.donorName},</p>
            <p>Someone has requested your donation on FoodLink:</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Donation Details:</h3>
              <p><strong>Item:</strong> ${donation.title || donation.item}</p>
              <p><strong>Quantity:</strong> ${donation.quantity} unit(s)</p>
              <p><strong>Tracking ID:</strong> ${donation.trackingId || 'N/A'}</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Requester Information:</h3>
              <p><strong>Name:</strong> ${requesterName}</p>
              <p><strong>Email:</strong> ${requesterEmail}</p>
              <p><strong>Phone:</strong> ${requesterPhone || 'Not provided'}</p>
              ${requesterMessage ? `<p><strong>Message:</strong> "${requesterMessage}"</p>` : ''}
            </div>
            
            <p>Please contact the requester directly to coordinate the donation handover.</p>
            <p>Thank you for your generosity!</p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 0.9em;">
              <p>This is an automated message from FoodLink.</p>
            </div>
          </div>
        `;
        
        try {
          // Send email to donor
          console.log(`Attempting to send email to donor at ${donorEmail}`);
          const emailSent = await sendEmail(donorEmail, emailSubject, emailHtml);
          
          if (emailSent) {
            console.log('Email sent successfully to donor');
            
            // Store the request in the database 
            const requestDate = new Date().toISOString();
            console.log('Storing donation request in database');
            
            db.run(
              'INSERT INTO donation_requests (donationId, requesterName, requesterEmail, requesterPhone, requesterMessage, requestDate) VALUES (?, ?, ?, ?, ?, ?)',
              [donationId, requesterName, requesterEmail, requesterPhone, requesterMessage, requestDate],
              function(err) {
                if (err) {
                  console.error('Error saving donation request to database:', err);
                  // Continue since email was already sent
                }
                
                const insertId = this.lastID;
                console.log(`Donation request saved with ID ${insertId}`);
                
                return res.status(200).json({ 
                  success: true, 
                  message: 'Your request has been sent to the donor. They will contact you soon.',
                  requestId: insertId
                });
              }
            );
          } else {
            // Email failed to send
            console.error('Failed to send email notification');
            return res.status(500).json({ 
              error: 'Failed to send email notification. Please try again later.' 
            });
          }
        } catch (error) {
          console.error('Error sending email or saving request:', error);
          return res.status(500).json({ 
            error: 'An error occurred while processing your request',
            details: error.message
          });
        }
      } catch (dbError) {
        console.error('Unhandled error in database callback:', dbError);
        return res.status(500).json({ 
          error: 'Internal server error',
          details: 'Error processing database results'
        });
      }
    });
  } catch (outerError) {
    console.error('Unhandled error in request handler:', outerError);
    return res.status(500).json({ 
      error: 'Server error',
      details: outerError.message
    });
  }
});

// Test route for email functionality
app.get('/api/test-email', (req, res) => {
  res.json({
    message: 'To test email functionality, use POST /api/test-email with a JSON body containing: to, subject, and message fields'
  });
});

app.post('/api/test-email', async (req, res) => {
  const { to, subject, message } = req.body;
  
  if (!to || !subject || !message) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['to', 'subject', 'message'],
      received: Object.keys(req.body)
    });
  }
  
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4CAF50; text-align: center;">Test Email</h2>
        <p>This is a test email from FoodLink.</p>
        <p>${message}</p>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 0.9em;">
          <p>This is an automated message from FoodLink.</p>
        </div>
      </div>
    `;
    
    const emailSent = await sendEmail(to, subject, htmlContent);
    
    if (emailSent) {
      return res.json({
        success: true,
        message: 'Test email sent successfully'
      });
    } else {
      return res.status(500).json({
        error: 'Failed to send test email',
        details: 'Check server logs for more information'
      });
    }
  } catch (error) {
    console.error('Error in test email route:', error);
    return res.status(500).json({
      error: 'An error occurred while sending the test email',
      message: error.message
    });
  }
});

// Function to check donation_requests table
function checkDonationRequestsTable() {
  console.log('Checking donation_requests table...');
  
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='donation_requests'", (err, table) => {
    if (err) {
      console.error('Error checking donation_requests table:', err);
      return;
    }
    
    if (!table) {
      console.error('donation_requests table does not exist! Creating it now.');
      createDonationRequestsTable();
      return;
    }
    
    // Check the structure of the donation_requests table
    db.all("PRAGMA table_info(donation_requests)", (err, columns) => {
      if (err) {
        console.error('Error checking donation_requests table structure:', err);
        return;
      }
      
      const columnNames = columns.map(col => col.name);
      console.log('Columns in donation_requests table:', columnNames);
      
      // Define the expected columns
      const expectedColumns = [
        'id', 'donationId', 'requesterName', 'requesterEmail', 'requesterPhone', 
        'requesterMessage', 'requestDate', 'isApproved'
      ];
      
      // Check for missing columns
      const missingColumns = expectedColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.error('Missing columns in donation_requests table:', missingColumns);
        addMissingColumnsToRequestsTable(missingColumns);
      } else {
        console.log('All expected columns are present in donation_requests table');
      }
    });
  });
}

// Function to create the donation_requests table
function createDonationRequestsTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS donation_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donationId INTEGER,
      requesterName TEXT,
      requesterEmail TEXT,
      requesterPhone TEXT,
      requesterMessage TEXT,
      requestDate TEXT,
      isApproved INTEGER DEFAULT 0,
      FOREIGN KEY(donationId) REFERENCES donations(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating donation_requests table:', err);
    } else {
      console.log('donation_requests table created successfully');
    }
  });
}

// Function to add missing columns to the donation_requests table
function addMissingColumnsToRequestsTable(missingColumns) {
  missingColumns.forEach(columnName => {
    let columnType = 'TEXT';  // Default column type
    
    // Set specific column types based on column name
    if (columnName === 'id' || columnName === 'donationId' || columnName === 'isApproved') {
      columnType = 'INTEGER';
    }
    
    const sql = `ALTER TABLE donation_requests ADD COLUMN ${columnName} ${columnType}`;
    
    db.run(sql, (err) => {
      if (err) {
        console.error(`Error adding column ${columnName} to donation_requests table:`, err);
      } else {
        console.log(`Added column ${columnName} to donation_requests table`);
      }
    });
  });
}

// Add error handling middleware at the top level
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Add detailed request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  next();
});

// Add response logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`[${new Date().toISOString()}] Response for ${req.method} ${req.url}:`);
    console.log('Response status:', res.statusCode);
    console.log('Response headers:', res.getHeaders());
    console.log('Response body:', data);
    return originalSend.apply(this, arguments);
  };
  next();
});

// Start server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
  
  // Check database tables
  checkDatabaseSchema();
  checkDonationRequestsTable();
});
