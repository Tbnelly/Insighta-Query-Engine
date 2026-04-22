const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables first, before anything else
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors()); // Sets Access-Control-Allow-Origin: * automatically
app.use(express.json()); // Parses incoming JSON request bodies

// Routes (we'll wire these in later steps)
app.use('/api/profiles', require('./routes/profiles'));

// Root health check — useful for confirming the server is alive
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Insighta Query Engine is running' });
});

// 404 handler — must come AFTER all routes
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// Global error handler — must come last
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});