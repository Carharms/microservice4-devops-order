# Order Service

Order management microservice for the e-commerce platform. Handles order creation, status updates, and order retrieval operations.

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL (for production)

## Quick Start

### Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd order-service
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start with Docker Compose:
```bash
docker-compose up -d
```

The service will be available at `http://localhost:3002`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Service port | `3002` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `subscriptions` |
| `DB_USER` | Database user | `dbuser` |
| `DB_PASSWORD` | Database password | `dbpassword` |
| `PRODUCT_SERVICE_URL` | Product service URL | `http://localhost:3001` |

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status
- `GET /api/orders/status/:status` - Get orders by status
- `DELETE /api/orders/:id` - Delete order

### Database Test
- `GET /api/test-db` - Test database connection

## Order Status Flow

Orders follow this status progression:
- `pending` - Initial state after creation
- `confirmed` - Order has been validated and confirmed
- `completed` - Order has been fulfilled
- `cancelled` - Order has been cancelled

## Development

### Running Tests
```bash
npm test
```

### Running with nodemon
```bash
npm run dev
```

### Docker Build
```bash
docker build -t order-service .
```

## Database Schema

The service expects the following tables to exist:
- `orders` - Main orders table
- `products` - Product catalog (from Product Service)

Refer to the main project repository for database initialization scripts.

## Integration

This service integrates with:
- **Product Service**: Validates product existence and pricing
- **Database**: PostgreSQL for order persistence

## CI/CD Pipeline

The service uses Jenkins for continuous integration and deployment:
- **Build Stage**: Code compilation and linting
- **Test Stage**: Unit and integration tests
- **Security Scan**: SonarQube analysis and dependency checks
- **Container Build**: Docker image creation
- **Container Push**: Push to Docker Hub
- **Deploy**: Environment-specific deployments

### Branch Strategy

- `main` - Production deployments (manual approval required)
- `develop` - Development environment (auto-deploy)
- `release/*` - Staging environment (auto-deploy)
- `feature/*` - Build and test only
- `hotfix/*` - Emergency fixes

## Monitoring

### Health Checks
The service includes built-in health checks accessible at `/health`

### Logging
Application logs are written to stdout and can be collected by container orchestration platforms.

## Security

- Non-root user execution in containers
- Helmet.js for security headers
- Input validation on all endpoints
- Regular dependency updates

## Contributing

1. Create feature branch from `develop`
2. Make changes and add tests
3. Submit pull request
4. Pipeline must pass all stages
5. Code review required before merge
