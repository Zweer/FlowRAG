# Acme Corp — System Architecture

## Overview

Acme Corp runs a microservices architecture on AWS. The platform handles e-commerce operations including product catalog, order management, payments, and shipping.

## Services

### API Gateway
The API Gateway is the single entry point for all client requests. It handles authentication, rate limiting, and request routing. Built with Express.js, deployed on ECS Fargate.

- **Port**: 443 (HTTPS)
- **Auth**: JWT tokens issued by the Auth Service
- **Rate limit**: 1000 req/min per user

### Auth Service
Handles user authentication and authorization. Issues JWT tokens with 1-hour expiry. Supports OAuth2 (Google, GitHub) and email/password login.

- **Database**: PostgreSQL (RDS)
- **Cache**: Redis (ElastiCache) for session storage
- **Owner**: Team Identity

### Product Catalog Service
Manages the product database. Provides search, filtering, and product detail APIs. Uses Elasticsearch for full-text search.

- **Database**: PostgreSQL (RDS)
- **Search**: Elasticsearch cluster
- **Cache**: Redis for hot products
- **Owner**: Team Catalog

### Order Service
Processes customer orders. Validates inventory, calculates pricing, and creates order records. Publishes events to Kafka for downstream processing.

- **Database**: PostgreSQL (RDS)
- **Events**: Kafka (MSK) — publishes `order.created`, `order.updated`, `order.cancelled`
- **Owner**: Team Commerce

### Payment Service
Integrates with Stripe for payment processing. Handles charges, refunds, and webhook events. PCI-DSS compliant.

- **Provider**: Stripe API
- **Database**: PostgreSQL (RDS) — encrypted at rest
- **Events**: Kafka — publishes `payment.completed`, `payment.failed`
- **Owner**: Team Payments

### Shipping Service
Manages order fulfillment and delivery tracking. Integrates with multiple carriers (FedEx, UPS, DHL).

- **Database**: DynamoDB
- **Events**: Kafka — consumes `payment.completed`, publishes `shipment.created`
- **Owner**: Team Logistics

### Notification Service
Sends emails, SMS, and push notifications. Consumes events from Kafka and triggers appropriate notifications.

- **Email**: Amazon SES
- **SMS**: Twilio
- **Push**: Firebase Cloud Messaging
- **Events**: Kafka — consumes `order.created`, `payment.completed`, `shipment.created`
- **Owner**: Team Platform

### Analytics Service
Collects and processes business metrics. Consumes all Kafka events and stores aggregated data in Redshift.

- **Database**: Redshift
- **Dashboard**: Grafana
- **Events**: Kafka — consumes all topics
- **Owner**: Team Data

## Data Flow

1. Client → API Gateway → Auth Service (JWT validation)
2. API Gateway → Product Catalog / Order Service / etc.
3. Order Service → Kafka → Payment Service
4. Payment Service → Kafka → Shipping Service
5. All services → Kafka → Notification Service
6. All services → Kafka → Analytics Service

## Infrastructure

- **Cloud**: AWS (eu-west-1)
- **Container orchestration**: ECS Fargate
- **CI/CD**: GitHub Actions → ECR → ECS
- **Monitoring**: CloudWatch + Grafana
- **Secrets**: AWS Secrets Manager
- **DNS**: Route 53
