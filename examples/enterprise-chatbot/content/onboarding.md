# Acme Corp — Developer Onboarding

Welcome to Acme Corp! This guide will help you set up your development environment and understand our workflows.

## Day 1: Environment Setup

### Prerequisites
- Node.js 20+
- Docker Desktop
- AWS CLI v2
- GitHub account (added to `acme-corp` org)

### Repository Access

All code lives in the `acme-corp` GitHub organization:
- `acme-corp/api-gateway` — API Gateway service
- `acme-corp/auth-service` — Authentication service
- `acme-corp/product-catalog` — Product Catalog service
- `acme-corp/order-service` — Order management
- `acme-corp/payment-service` — Payment processing
- `acme-corp/shipping-service` — Shipping and fulfillment
- `acme-corp/notification-service` — Notifications (email, SMS, push)
- `acme-corp/analytics-service` — Business analytics
- `acme-corp/infra` — Terraform infrastructure code

### Local Development

1. Clone the service you'll be working on
2. Copy `.env.example` to `.env` and fill in local values
3. Run `docker compose up` to start dependencies (PostgreSQL, Redis, Kafka)
4. Run `npm install && npm run dev`

Each service runs on a different port locally:
- API Gateway: 3000
- Auth Service: 3001
- Product Catalog: 3002
- Order Service: 3003
- Payment Service: 3004

### AWS Access

Request AWS access through the IT portal. You'll get:
- IAM user with MFA
- Access to `dev` and `staging` environments
- Read-only access to `production` (write access requires approval)

Use `aws sso login --profile acme-dev` to authenticate.

## Day 2: Understanding the Codebase

### Code Standards
- TypeScript strict mode
- Biome for linting and formatting
- Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- 80% minimum test coverage

### Architecture Patterns
- Each service owns its database (no shared databases)
- Services communicate via Kafka events (async) or HTTP (sync)
- All HTTP calls go through the API Gateway
- Secrets are stored in AWS Secrets Manager, never in code

### Database Migrations
We use Prisma for database migrations:
```bash
npx prisma migrate dev    # Create and apply migration
npx prisma migrate deploy # Apply pending migrations (CI/CD)
```

## Week 1: First Contribution

### Branching Strategy
- `main` — production-ready code
- `develop` — integration branch
- `feature/*` — feature branches (from `develop`)
- `hotfix/*` — urgent fixes (from `main`)

### Pull Request Process
1. Create a feature branch from `develop`
2. Make your changes with tests
3. Open a PR with a clear description
4. Get at least 1 approval from a team member
5. CI must pass (tests, lint, type check)
6. Squash merge into `develop`

### Deployment
- Merges to `develop` → auto-deploy to `staging`
- Merges to `main` → auto-deploy to `production`
- Rollback: revert the merge commit and push to `main`

## Team Structure

| Team | Services | Slack Channel |
|------|----------|---------------|
| Identity | Auth Service | #team-identity |
| Catalog | Product Catalog | #team-catalog |
| Commerce | Order Service | #team-commerce |
| Payments | Payment Service | #team-payments |
| Logistics | Shipping Service | #team-logistics |
| Platform | API Gateway, Notification Service | #team-platform |
| Data | Analytics Service | #team-data |

## Useful Links

- **Confluence**: Internal documentation wiki
- **Jira**: Project management and issue tracking
- **Grafana**: Monitoring dashboards (https://grafana.internal.acme.com)
- **Kibana**: Log search (https://kibana.internal.acme.com)
- **Swagger**: API docs (https://api.staging.acme.com/docs)
