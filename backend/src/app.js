require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const swaggerSpec = require('./swagger/swaggerConfig');
const logger = require('./utils/logger');
const AppError = require('./utils/AppError');

const app = express();
const server = http.createServer(app);

// ===== Allowed Origins =====
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

// ===== Socket.IO =====
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

global.io = io;

io.on('connection', (socket) => {
  logger.debug(`Socket connected: ${socket.id}`);
  socket.on('subscribe', (userId) => {
    socket.join(`user:${userId}`);
  });
  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
});

// ===== Security =====
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ===== CORS =====
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.error(`CORS blocked: ${origin}`);
      console.error(`Allowed: ${allowedOrigins.join(', ')}`);
      return callback(new Error(`CORS blocked for: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Handle preflight
app.options('*', cors());

// Safety net headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ===== Rate Limiting =====
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later.',
  },
});
app.use('/api', limiter);

// ===== General Middleware =====
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// ===== API Routes =====
app.use('/api/v1', routes);

// ===== Swagger Docs =====
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Team Task Tracker API',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: { persistAuthorization: true },
  })
);

// ===== Root =====
app.get('/', (req, res) => {
  res.json({
    message: 'Team Task Tracker API',
    version: '1.0.0',
    docs: '/api/docs',
    health: '/api/v1/health',
  });
});

// ===== 404 Handler =====
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found.`, 404, 'NOT_FOUND'));
});

// ===== Global Error Handler =====
app.use(errorHandler);

// ===== Bootstrap =====
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    connectRedis();

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`API Docs: http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

startServer();

module.exports = { app, server };
