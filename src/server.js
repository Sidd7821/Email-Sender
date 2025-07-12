const express = require('express');
const connectDB = require('./config/database');
const applyRoutes = require('./routes/apply');
const cors = require('cors');
const path = require('path');

const app = express();

// // CORS configuration
// const corsOptions = {
//   origin: '*', // Allow only your frontend
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//   optionsSuccessStatus: 204,
// };
// app.use(cors(corsOptions));


// Simplified CORS configuration to allow all requests
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'OPTIONS'], // Explicitly allow necessary methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow necessary headers
    optionsSuccessStatus: 204, // Standard status for OPTIONS
  }));
  
  // Debug middleware to log incoming requests
  app.use((req, res, next) => {
    console.log(`Request: ${req.method} ${req.url} from ${req.headers.origin}`);
    next();
  });
  
  // Explicitly handle OPTIONS requests for /api/apply
  app.options('/api/apply', cors(), (req, res) => {
    console.log('Handling OPTIONS request for /api/apply');
    res.status(204).send();
  });

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/apply', applyRoutes);

// Serve HTML status page for root route
app.get('/', (req, res) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Status - Job Application API</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            
            .container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                max-width: 500px;
                width: 90%;
            }
            
            .status-icon {
                width: 80px;
                height: 80px;
                background: #4CAF50;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .status-icon::after {
                content: '✓';
                font-size: 40px;
                color: white;
                font-weight: bold;
            }
            
            .title {
                font-size: 2.5em;
                margin-bottom: 10px;
                font-weight: 700;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .subtitle {
                font-size: 1.2em;
                margin-bottom: 30px;
                opacity: 0.9;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 30px 0;
            }
            
            .info-card {
                background: rgba(255, 255, 255, 0.1);
                padding: 20px;
                border-radius: 15px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .info-label {
                font-size: 0.9em;
                opacity: 0.8;
                margin-bottom: 5px;
            }
            
            .info-value {
                font-size: 1.2em;
                font-weight: 600;
            }
            
            .endpoints {
                margin-top: 30px;
                text-align: left;
            }
            
            .endpoints h3 {
                margin-bottom: 15px;
                text-align: center;
                font-size: 1.3em;
            }
            
            .endpoint {
                background: rgba(255, 255, 255, 0.1);
                padding: 12px 15px;
                margin: 8px 0;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
                border-left: 4px solid #4CAF50;
            }
            
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                font-size: 0.9em;
                opacity: 0.8;
            }
            
            @media (max-width: 600px) {
                .info-grid {
                    grid-template-columns: 1fr;
                }
                
                .title {
                    font-size: 2em;
                }
                
                .container {
                    padding: 30px 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="status-icon"></div>
            <h1 class="title">Server is Live!</h1>
            <p class="subtitle">Job Application API Server</p>
            
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-label">Status</div>
                    <div class="info-value">🟢 Running</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Port</div>
                    <div class="info-value">${process.env.PORT || 3000}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Environment</div>
                    <div class="info-value">${process.env.NODE_ENV || 'Development'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Uptime</div>
                    <div class="info-value" id="uptime">${Math.floor(process.uptime())}s</div>
                </div>
            </div>
            
            <div class="endpoints">
                <h3>Available Endpoints</h3>
                <div class="endpoint">GET / - Server Status Page</div>
                <div class="endpoint">POST /api/apply - Submit Job Application</div>
                <div class="endpoint">GET /uploads/* - Static File Access</div>
            </div>
            
            <div class="footer">
                <p>Server started at: ${new Date().toLocaleString()}</p>
                <p>Ready to accept job applications ✨</p>
            </div>
        </div>
        
        <script>
            // Update uptime every second
            setInterval(() => {
                const uptimeElement = document.getElementById('uptime');
                if (uptimeElement) {
                    fetch('/api/uptime')
                        .catch(() => {
                            // If uptime endpoint doesn't exist, just increment local counter
                            const currentUptime = parseInt(uptimeElement.textContent);
                            uptimeElement.textContent = (currentUptime + 1) + 's';
                        });
                }
            }, 1000);
        </script>
    </body>
    </html>
  `;
  
  res.send(htmlContent);
});

// Optional: Add uptime API endpoint
app.get('/api/uptime', (req, res) => {
  res.json({ 
    uptime: process.uptime(),
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Initialize database and start server
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to see the status page`);
  });
});