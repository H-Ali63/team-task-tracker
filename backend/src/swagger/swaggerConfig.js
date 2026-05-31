const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Team Task Tracker API',
      version: '1.0.0',
      description: `
## Team Task Tracker REST API

A production-grade task management system with:
- JWT authentication with refresh token rotation
- Role-based access control (ADMIN, MANAGER, MEMBER)
- Enforced status transitions (TODO → IN_PROGRESS → IN_REVIEW → DONE)
- Redis caching for task lists
- Organization-scoped data access

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
\`Authorization: Bearer <accessToken>\`

### Roles
| Role    | Permissions                                       |
|---------|---------------------------------------------------|
| ADMIN   | Full access: users, tasks, organization           |
| MANAGER | Tasks and project management, cannot manage users |
| MEMBER  | View and update only their own assigned tasks     |
      `,
      contact: {
        name: 'API Support',
        email: 'support@teamtracker.dev',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '64a8f0b12345678901234567' },
            name: { type: 'string', example: 'Ali Haidar' },
            email: { type: 'string', example: 'haidar@gmail.com' },
            role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'MEMBER'] },
            organizationId: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string', example: 'Implement login page' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            status: {
              type: 'string',
              enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
            },
            assignee: { $ref: '#/components/schemas/User' },
            dueDate: { type: 'string', format: 'date-time' },
            organizationId: { type: 'string' },
            createdBy: { $ref: '#/components/schemas/User' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNextPage: { type: 'boolean' },
            hasPrevPage: { type: 'boolean' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'integer', example: 400 },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'due_date must be a future date' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Ali Haidar' },
            email: { type: 'string', example: 'haidar@gmail.com' },
            password: { type: 'string', minLength: 6, example: 'secret123' },
            organizationName: {
              type: 'string',
              example: 'Acme Corp',
              description: 'Provide this to CREATE a new organization (you become ADMIN)',
            },
            organizationId: {
              type: 'string',
              example: '64a8f0b12345678901234567',
              description: 'Provide this to JOIN an existing organization (you become MEMBER)',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'haidar@gmail.com' },
            password: { type: 'string', example: 'secret123' },
          },
        },
        CreateTaskRequest: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', example: 'Implement login page' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
            assignee: { type: 'string', example: '64a8f0b12345678901234567' },
            dueDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Tasks', description: 'Task management endpoints' },
      { name: 'Users', description: 'User management endpoints' },
    ],
  },
  apis: ['./src/routes/*.js', './src/docs/*.yaml'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
