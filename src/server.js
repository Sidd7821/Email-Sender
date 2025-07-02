const express = require('express');
const connectDB = require('./config/database');
const applyRoutes = require('./routes/apply');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS configuration
const corsOptions = {
  origin: 'https://friendly-job-form-wizard.lovable.app', // Allow only your frontend
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Allow cookies/auth headers if needed
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/apply', applyRoutes);

// Initialize database and start server
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});