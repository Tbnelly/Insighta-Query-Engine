const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// 1. API routes first
app.use('/api/profiles', require('./routes/profiles'));

// 2. Root health check second
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Insighta Query Engine is running' });
});

app.get('/debug', (req, res) => {
  res.json({
    node_env: process.env.NODE_ENV,
    mongo_uri_set: !!process.env.MONGODB_URI,
    mongo_uri_prefix: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) : 'NOT SET'
  });
});

// 3. 404 handler LAST
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

app.use(require('./middleware/errorHandler'));

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;