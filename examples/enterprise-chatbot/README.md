# Enterprise Documentation Chatbot

A complete example of using FlowRAG to build an internal documentation chatbot for a fictional company (Acme Corp).

## What This Demonstrates

1. **Indexing** — Batch-index company docs (architecture, API guide, onboarding, security)
2. **Knowledge Graph** — Automatic extraction of services, databases, teams, and their relationships
3. **RAG Chatbot** — Retrieve relevant context via FlowRAG, generate answers via LLM
4. **Citations** — Every answer references the source documents

## Architecture

```
User Question
      │
      ▼
┌─────────────┐
│  FlowRAG    │  Dual retrieval: vector search + knowledge graph
│  .search()  │  Returns relevant chunks with source citations
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  OpenAI     │  Takes question + retrieved context
│  Chat API   │  Generates natural language answer
└──────┬──────┘
       │
       ▼
  Answer with [1][2] citations
```

FlowRAG handles the **Retrieve** part. OpenAI handles the **Generate** part.

## Setup

```bash
# From the FlowRAG monorepo root
npm install
npm run build

# Set your OpenAI API key
export OPENAI_API_KEY=your-key
```

### Dependencies (for standalone use)

```bash
npm install @flowrag/pipeline @flowrag/presets @flowrag/provider-openai openai
```

## Usage

### Step 1: Index the documentation

```bash
npm run index
```

This scans `./content/`, extracts entities and relations, generates embeddings, and builds the knowledge graph. You'll see:

```
📚 Indexing company documentation...

Found 4 documents

📄 Processing: doc:...
  🤖 LLM: gpt-5-mini (1200ms, 850 tokens)
  📐 Embed: 1 texts (50ms)
✅ Done

🎉 Indexing complete!

📊 Stats: 4 docs, 12 chunks, 25 entities, 40 relations
```

### Step 2: Chat with the docs

```bash
npm run chat
```

Example conversation:

```
🤖 Acme Corp Documentation Chatbot
   Ask questions about architecture, APIs, onboarding, security...
   Type "quit" to exit.

You: What services depend on Kafka?

Bot: Several services in the Acme Corp architecture depend on Kafka (MSK) for
event-driven communication [1]:

- **Order Service** — publishes `order.created`, `order.updated`, `order.cancelled` [1]
- **Payment Service** — publishes `payment.completed`, `payment.failed` and is triggered by order events [1]
- **Shipping Service** — consumes `payment.completed` and publishes `shipment.created` [1]
- **Notification Service** — consumes events from all services [1]
- **Analytics Service** — consumes all Kafka topics for business metrics [1]

You: How do I set up my dev environment?

Bot: Here's how to set up your development environment [1]:

1. Install prerequisites: Node.js 20+, Docker Desktop, AWS CLI v2 [1]
2. Get added to the `acme-corp` GitHub organization [1]
3. Clone the service you'll work on [1]
4. Copy `.env.example` to `.env` and fill in local values [1]
5. Run `docker compose up` for dependencies (PostgreSQL, Redis, Kafka) [1]
6. Run `npm install && npm run dev` [1]

For AWS access, request it through the IT portal and use `aws sso login --profile acme-dev` [1].

You: What's the password policy?

Bot: The password policy requires [1]:
- Minimum 12 characters
- Must include uppercase, lowercase, number, and special character
- Passwords expire every 90 days
- Cannot reuse the last 5 passwords
- Account locks after 5 failed attempts (30-minute lockout)

MFA is also mandatory for AWS console access, VPN, and production environments [1].

You: quit
Bye! 👋
```

## Sample Documentation

The `content/` directory contains 4 fictional documents:

| File | Content |
|------|---------|
| `architecture.md` | Microservices architecture, data flow, infrastructure |
| `api-guide.md` | REST API endpoints, authentication, rate limits |
| `onboarding.md` | Developer setup, code standards, deployment process |
| `security.md` | Security policies, compliance, incident response |

## Key FlowRAG Features Used

- **Dual retrieval** (`hybrid` mode) — combines vector similarity with knowledge graph traversal
- **Knowledge graph** — automatically maps services, databases, teams, and their relationships
- **Citations** — `sources` field in search results tracks document origin
- **Observability hooks** — logs LLM calls and embedding operations during indexing
- **Incremental indexing** — re-running `npm run index` skips unchanged documents
- **Export** — generates a Graphviz DOT graph of all extracted entities and relations
