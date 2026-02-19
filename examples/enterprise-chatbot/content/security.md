# Acme Corp — Security Policies

## Authentication & Access Control

### Password Policy
- Minimum 12 characters
- Must include uppercase, lowercase, number, and special character
- Passwords expire every 90 days
- Cannot reuse last 5 passwords
- Account locks after 5 failed attempts (30-minute lockout)

### Multi-Factor Authentication (MFA)
MFA is mandatory for:
- All AWS console access
- VPN connections
- Production environment access
- Admin panels

Supported MFA methods: TOTP (Google Authenticator, Authy), hardware keys (YubiKey).

### API Key Management
- API keys must be stored in AWS Secrets Manager
- Never commit secrets to Git (pre-commit hooks enforce this)
- Rotate API keys every 90 days
- Use separate keys for each environment (dev, staging, production)

## Data Protection

### Encryption
- **At rest**: All databases use AES-256 encryption (RDS, DynamoDB, Redshift)
- **In transit**: TLS 1.3 for all HTTP traffic, TLS 1.2 minimum
- **Payment data**: PCI-DSS Level 1 compliant, tokenized via Stripe

### PII Handling
Personal Identifiable Information (PII) includes: names, emails, addresses, phone numbers, payment details.

- PII must be encrypted at rest
- PII access is logged and auditable
- PII must not appear in logs (use masking)
- Data retention: 2 years for orders, 30 days for logs
- GDPR: users can request data export or deletion

### Backup Policy
- Database backups: daily automated snapshots, 30-day retention
- Cross-region replication for disaster recovery (eu-west-1 → eu-central-1)
- Monthly backup restoration tests

## Network Security

### VPC Architecture
- Public subnet: API Gateway, Load Balancers
- Private subnet: All services, databases
- No direct internet access from private subnets (NAT Gateway for outbound)

### Security Groups
- Services can only communicate on specific ports
- Database access restricted to service security groups
- SSH access only through bastion host (with MFA)

### WAF Rules
AWS WAF protects the API Gateway:
- SQL injection detection
- XSS prevention
- Rate limiting (DDoS protection)
- Geo-blocking (block traffic from sanctioned countries)

## Incident Response

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| P1 | Service down, all users affected | 15 minutes | Payment processing failure |
| P2 | Major feature broken, many users affected | 1 hour | Search not working |
| P3 | Minor issue, workaround available | 4 hours | Slow dashboard loading |
| P4 | Cosmetic or low-impact issue | Next sprint | Typo in email template |

### Incident Process
1. **Detect**: Monitoring alert or user report
2. **Triage**: On-call engineer assesses severity
3. **Communicate**: Post in #incidents Slack channel
4. **Mitigate**: Apply fix or rollback
5. **Resolve**: Confirm service restored
6. **Post-mortem**: Write RCA within 48 hours (P1/P2 only)

### On-Call Rotation
Each team has a weekly on-call rotation. On-call engineers:
- Must respond to P1/P2 alerts within 15 minutes
- Have production write access during on-call
- Get a day off after on-call week
- Escalation: Team Lead → Engineering Manager → CTO

## Compliance

### SOC 2 Type II
Acme Corp maintains SOC 2 Type II certification. Annual audits cover:
- Security
- Availability
- Processing integrity
- Confidentiality

### GDPR
- Data Processing Agreement (DPA) with all vendors
- Privacy Impact Assessments for new features
- Data Protection Officer: privacy@acme.com
- User data export/deletion within 30 days of request

### PCI-DSS
Payment Service is PCI-DSS Level 1 compliant:
- No raw card numbers stored (Stripe tokenization)
- Quarterly vulnerability scans
- Annual penetration testing
- Encrypted cardholder data environment
