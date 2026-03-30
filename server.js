// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { runStartupMigrations } = require('./scripts/run_startup_migrations');
const app = express();
const PORT = process.env.PORT || 5000;

const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const users_routes=require('./app/routes/users_route');
const tasks_routes=require('./app/routes/tasks_route');
const payment_routes=require('./app/routes/payment_route');
const dashboard_routes=require('./app/routes/dashboard.route');

const defaultAllowedOrigins = [
  'https://batprox.com',
  'https://www.batprox.com',
  'http://batprox.com',
  'http://www.batprox.com',
  'http://localhost:3000',
  'http://localhost:5000'
];

const envAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envAllowedOrigins]));

const normalizeOrigin = (origin) => {
  if (!origin || typeof origin !== 'string') return '';
  return origin.trim().replace(/\/$/, '').toLowerCase();
};

const isAllowedOrigin = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return true;

  const normalizedAllowed = allowedOrigins.map(normalizeOrigin);
  if (normalizedAllowed.includes(normalizedOrigin)) {
    return true;
  }

  try {
    const { hostname } = new URL(normalizedOrigin);
    return hostname === 'batprox.com' || hostname.endsWith('.batprox.com');
  } catch (err) {
    return false;
  }
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204
};
// Middleware (optional)
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple response-time logging middleware
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs.toFixed(2)} ms`);
  });
  next();
});


app.use('/user',users_routes);
app.use('/api/user',users_routes);
app.use('/uploads', express.static(uploadsDir),users_routes);
app.use('/api/uploads', express.static(uploadsDir),users_routes);
app.use('/user', tasks_routes);
app.use('/payment', payment_routes);
app.use('/api/payment', payment_routes);
app.use('/dashboard', dashboard_routes);
app.use('/api/dashboard', dashboard_routes);

const startServer = async () => {
  try {
    await runStartupMigrations({ failFast: true });

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Startup migration failed. Server not started.', err && err.message ? err.message : err);
    process.exit(1);
  }
};

startServer();
