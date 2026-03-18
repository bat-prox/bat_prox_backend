// index.js
require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

const users_routes=require('./app/routes/users_route');
const tasks_routes=require('./app/routes/tasks_route');
// Middleware (optional)
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
app.use('/uploads', express.static('uploads'),users_routes);
app.use('/tasks', tasks_routes);


// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
