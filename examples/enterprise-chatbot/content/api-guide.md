# Acme Corp — API Guide

## Authentication

All API requests require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Obtaining a Token

```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secret"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600
}
```

Tokens expire after 1 hour. Use the refresh endpoint to get a new token without re-authenticating.

### OAuth2 Login

Redirect users to:
- Google: `GET /auth/oauth/google`
- GitHub: `GET /auth/oauth/github`

After successful authentication, the user is redirected to your callback URL with a token.

## Products

### List Products

```
GET /products?page=1&limit=20&category=electronics
```

Query parameters:
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `category` — filter by category
- `q` — full-text search query
- `minPrice`, `maxPrice` — price range filter

### Get Product

```
GET /products/:id
```

Returns full product details including description, images, pricing, and availability.

### Search Products

```
GET /products/search?q=wireless+headphones
```

Uses Elasticsearch for full-text search with relevance scoring. Supports fuzzy matching and synonyms.

## Orders

### Create Order

```
POST /orders
Content-Type: application/json

{
  "items": [
    { "productId": "prod_123", "quantity": 2 }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Springfield",
    "country": "US",
    "zip": "62701"
  }
}
```

The order goes through these states:
1. `pending` — order created, awaiting payment
2. `paid` — payment confirmed
3. `shipped` — handed to carrier
4. `delivered` — confirmed delivery
5. `cancelled` — order cancelled (before shipping only)

### Get Order

```
GET /orders/:id
```

### List User Orders

```
GET /orders?status=shipped&page=1
```

## Payments

Payments are processed automatically when an order is created. The Payment Service charges the user's default payment method via Stripe.

### Add Payment Method

```
POST /payments/methods
Content-Type: application/json

{
  "stripeToken": "tok_visa"
}
```

### Request Refund

```
POST /orders/:id/refund
Content-Type: application/json

{
  "reason": "Item damaged"
}
```

Refunds are processed within 5-10 business days.

## Webhooks

Subscribe to events for real-time updates:

```
POST /webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["order.created", "payment.completed", "shipment.created"]
}
```

All webhook payloads include:
- `event` — event type
- `timestamp` — ISO 8601 timestamp
- `data` — event-specific payload
- `signature` — HMAC-SHA256 signature for verification

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Authentication | 10 req/min |
| Products (read) | 1000 req/min |
| Orders (write) | 100 req/min |
| Search | 200 req/min |

Rate limit headers are included in every response:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
