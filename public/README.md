# FoodLink

FoodLink is a community-driven platform committed to reducing food waste and supporting those in need. It connects donors with verified NGOs and shelters to create real impact in communities.

## Features

- User registration and authentication
- Donation submission and management
- Donation listing and filtering
- Mobile-responsive design
- User profiles with donation history

## Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/foodlink.git
cd foodlink
```

2. Install dependencies:
```
npm install
```

3. Start the server:
```
npm start
```

The application will be available at http://localhost:5500

## Development

For development with automatic server restart:
```
npm run dev
```

## Project Structure

- `public/` - Static files (HTML, CSS, client-side JS)
  - `page.html` - Main landing page
  - `index.html` - Login page
  - `signup.html` - Registration page
  - `list.html` - Available donations listing
- `server.js` - Express server and API endpoints
- `data/` - Data storage (created automatically)

## API Endpoints

- `GET /api/donations` - Get all donations
- `POST /api/donations` - Create a new donation
- `GET /api/donations/:id` - Get a specific donation
- `PUT /api/donations/:id` - Update a donation
- `DELETE /api/donations/:id` - Delete a donation

## Deployment

This application can be deployed to various platforms:

### Heroku

1. Create a Heroku account and install the Heroku CLI
2. Login to Heroku:
```
heroku login
```

3. Create a new Heroku app:
```
heroku create foodlink-app
```

4. Push to Heroku:
```
git push heroku main
```

### Vercel or Netlify

For static hosting, you can deploy the `public` directory to Vercel or Netlify, and deploy the API separately or use serverless functions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 