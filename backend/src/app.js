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

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://team-task-trackers.vercel.app',
  'https://*.vercel.app',
];

const normalizeOrigin = (origin) => {
  if (!origin) return '';

  const trimmedOrigin = origin.trim();
  if (trimmedOrigin === '*') return trimmedOrigin;

  return trimmedOrigin.replace(/\/+$/, '');
};

const parseCorsOrigins = () => {
  const configuredOrigins = [
    process.env.CORS_ORIGINS,
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
  ]
    .filter(Boolean)
    .flatMap((originList) => originList.split(','))
    .map(normalizeOrigin)
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_CORS_ORIGINS, ...configuredOrigins]));
};

const wildcardToRegExp = (originPattern) => {
  const escapedPattern = originPattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escapedPattern}$`);
};

const allowedOrigins = parseCorsOrigins();
const originMatchers = allowedOrigins.map((allowedOrigin) => {
  if (allowedOrigin === '*') {
    return () => true;
  }

  if (allowedOrigin.includes('*')) {
    const wildcardMatcher = wildcardToRegExp(allowedOrigin);
    return (origin) => wildcardMatcher.test(origin);
  }

  return (origin) => origin === allowedOrigin;
});

const isCorsOriginAllowed = (origin) => {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  return originMatchers.some((matchesOrigin) => matchesOrigin(normalizedOrigin));
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isCorsOriginAllowed(origin)) {
      return callback(null, true);
    }

    logger.warn(`Blocked CORS origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const app = express();
const server = http.createServer(app);

// Required when running behind Render/other reverse proxies so rate-limit sees client IP correctly.
app.set('trust proxy', 1);

// ===== Socket.IO Setup =====
const io = new Server(server, {
  cors: {
    ...corsOptions,
    methods: ['GET', 'POST'],
  },
  allowRequest: (req, callback) => {
    const origin = req.headers.origin;

    if (isCorsOriginAllowed(origin)) {
      return callback(null, true);
    }

    logger.warn(`Blocked Socket.IO origin: ${origin}`);
    return callback(null, false);
  },
});

// Make io available globally for service layer notifications
global.io = io;

io.on('connection', (socket) => {
  logger.debug(`Socket connected: ${socket.id}`);

  // Client subscribes to their own notification room
  socket.on('subscribe', (userId) => {
    socket.join(`user:${userId}`);
    logger.debug(`Socket ${socket.id} subscribed to user:${userId}`);
  });

  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
});

// ===== Security Middleware =====
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors(corsOptions)
);

// ===== Rate Limiting =====
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// ===== General Middleware =====
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
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
      logger.info(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
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
