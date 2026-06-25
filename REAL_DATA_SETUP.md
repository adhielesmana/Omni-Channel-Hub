# Setting Up Real Data in OmniChat

The database has been cleaned of all dummy data. This guide walks you through populating your actual business data.

## Overview

OmniChat has two main ways to add real data:

1. **SQL Migration** - Bulk import via SQL file (best for initial setup)
2. **REST API** - Add data through API endpoints (best for ongoing management)

---

## Method 1: SQL Migration (Initial Setup)

### Step 1: Edit the Seed File

Edit `/migrations/003_seed_real_data.sql` and replace the placeholder values with your real data:

```sql
-- STEP 1: Add your departments
INSERT INTO departments (name, description, routing_mode, is_active) VALUES
    ('Customer Support', 'Main support team', 'round_robin', TRUE),
    ('Sales', 'Sales team for leads', 'manual', TRUE),
    ('Billing', 'Billing and invoicing', 'manual', TRUE);

-- STEP 2: Add your team members
INSERT INTO users (email, name, role, department_id, is_active) VALUES
    ('john@company.com', 'John Smith', 'supervisor', (SELECT id FROM departments WHERE name = 'Customer Support'), TRUE),
    ('jane@company.com', 'Jane Doe', 'agent', (SELECT id FROM departments WHERE name = 'Customer Support'), TRUE),
    ('sales@company.com', 'Sales Lead', 'supervisor', (SELECT id FROM departments WHERE name = 'Sales'), TRUE);

-- STEP 3: Add your messaging channels
INSERT INTO channels (name, channel_type, phone_number, external_id, webhook_verify_token, is_active) VALUES
    ('WhatsApp Business', 'whatsapp', '+1 555 123 4567', 'waba_12345', 'verify_token_123', TRUE);

-- STEP 4: Add your contacts
INSERT INTO contacts (name, phone, email, channel_type, external_id) VALUES
    ('Customer One', '+1 555 987 6543', 'customer1@example.com', 'whatsapp', 'cust_1'),
    ('Customer Two', '+1 555 654 3210', 'customer2@example.com', 'whatsapp', 'cust_2');
```

### Step 2: Run the Migration

```bash
# From the project root
pnpm --filter @workspace/db run push
```

---

## Method 2: REST API (Ongoing Management)

Once the API is running, you can add data through HTTP requests:

### Prerequisites

```bash
# Make sure API is running on port 8080
export NODE_ENV=production
export PORT=8080
export DATABASE_URL='postgresql://omnichat:PASSWORD@localhost:5432/omnichat'
pnpm --filter @workspace/api-server run start
```

### API Endpoints

#### 1. Create Department

```bash
curl -X POST http://localhost:8080/api/departments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support",
    "description": "Main support team",
    "routing_mode": "round_robin",
    "is_active": true
  }'
```

#### 2. Create User

```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.smith@company.com",
    "name": "John Smith",
    "role": "agent",
    "department_id": 1,
    "is_active": true
  }'
```

**Available roles:** `admin`, `supervisor`, `agent`

#### 3. Create Channel

For WhatsApp:
```bash
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "WhatsApp Business",
    "channel_type": "whatsapp",
    "phone_number": "+1 555 123 4567",
    "external_id": "waba_12345",
    "webhook_verify_token": "verify_token_123",
    "is_active": true
  }'
```

For Instagram/Facebook:
```bash
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Instagram Business",
    "channel_type": "instagram",
    "page_id": "ig_page_12345",
    "external_id": "ig_external_1",
    "webhook_verify_token": "verify_token_456",
    "is_active": true
  }'
```

**Available channel types:** `whatsapp`, `instagram`, `facebook`, `telegram`

#### 4. Create Contact

```bash
curl -X POST http://localhost:8080/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Customer",
    "phone": "+1 555 987 6543",
    "email": "john@customer.com",
    "channel_type": "whatsapp",
    "external_id": "cust_12345"
  }'
```

#### 5. Get All Data

```bash
# Get departments
curl http://localhost:8080/api/departments

# Get users
curl http://localhost:8080/api/users

# Get channels
curl http://localhost:8080/api/channels

# Get contacts
curl http://localhost:8080/api/contacts

# Get conversations
curl http://localhost:8080/api/conversations
```

---

## Data Structure Reference

### Departments

- `name` (required): Department name
- `description` (optional): Description
- `routing_mode`: `round_robin` or `manual`
- `is_active`: true/false

### Users

- `email` (required): Unique email address
- `name` (required): Full name
- `role` (required): `admin`, `supervisor`, or `agent`
- `department_id` (optional): Department ID (null for admin users)
- `avatar_url` (optional): Avatar image URL
- `is_active`: true/false

### Channels

**WhatsApp:**
- `name` (required): Channel name
- `channel_type`: `whatsapp`
- `phone_number` (required): Business phone number
- `external_id` (required): WhatsApp Business Account ID
- `webhook_verify_token`: Webhook verify token for Meta
- `is_active`: true/false

**Instagram/Facebook:**
- `name` (required): Channel name
- `channel_type`: `instagram` or `facebook`
- `page_id` (required): Instagram/Facebook Page ID
- `external_id` (required): External channel ID
- `webhook_verify_token`: Webhook verify token for Meta
- `is_active`: true/false

### Contacts

- `name` (required): Contact name
- `phone` (optional): Phone number
- `email` (optional): Email address
- `channel_type` (required): `whatsapp`, `instagram`, `facebook`, etc.
- `external_id` (required): External unique ID from the channel

---

## Example: Complete Setup

Here's a complete example of setting up OmniChat with real data:

### 1. Update SQL Migration File

Edit `migrations/003_seed_real_data.sql`:

```sql
BEGIN;

-- Departments
INSERT INTO departments (name, description, routing_mode, is_active) VALUES
    ('Support', 'Customer support team', 'round_robin', TRUE),
    ('Sales', 'Sales team', 'manual', TRUE),
    ('Billing', 'Billing department', 'manual', TRUE)
ON CONFLICT DO NOTHING;

-- Users
INSERT INTO users (email, name, role, department_id, is_active) VALUES
    ('admin@mycompany.com', 'Admin User', 'admin', NULL, TRUE),
    ('support1@mycompany.com', 'John Support', 'supervisor', (SELECT id FROM departments WHERE name = 'Support'), TRUE),
    ('support2@mycompany.com', 'Jane Support', 'agent', (SELECT id FROM departments WHERE name = 'Support'), TRUE),
    ('sales@mycompany.com', 'Sales Lead', 'supervisor', (SELECT id FROM departments WHERE name = 'Sales'), TRUE)
ON CONFLICT (email) DO NOTHING;

-- Channels
INSERT INTO channels (name, channel_type, phone_number, external_id, webhook_verify_token, is_active) VALUES
    ('WhatsApp Business', 'whatsapp', '+1 555 123 4567', 'waba_123', 'token_123', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO channels (name, channel_type, page_id, external_id, webhook_verify_token, is_active) VALUES
    ('Instagram Business', 'instagram', 'ig_page_123', 'ig_123', 'token_456', TRUE)
ON CONFLICT DO NOTHING;

-- Contacts
INSERT INTO contacts (name, phone, email, channel_type, external_id) VALUES
    ('Alice Johnson', '+1 555 111 1111', 'alice@customer.com', 'whatsapp', 'cust_alice'),
    ('Bob Smith', '+1 555 222 2222', 'bob@customer.com', 'whatsapp', 'cust_bob'),
    ('Carol White', '+1 555 333 3333', 'carol@customer.com', 'instagram', 'cust_carol')
ON CONFLICT DO NOTHING;

COMMIT;
```

### 2. Run Migration

```bash
pnpm --filter @workspace/db run push
```

### 3. Verify Data

```bash
curl http://localhost:8080/api/departments
curl http://localhost:8080/api/users
curl http://localhost:8080/api/channels
curl http://localhost:8080/api/contacts
```

---

## Webhook Setup (For Production)

To receive real messages from Meta (WhatsApp, Instagram, Facebook):

1. Configure your channels with correct IDs and tokens
2. Set up webhook endpoint in Meta settings:
   - Callback URL: `https://ocha.kabeltelekom.id/api/webhooks/meta`
   - Verify Token: Use the value from your channel record

3. Messages from real users will be automatically ingested

---

## Troubleshooting

### Issue: "Department not found"
- Verify department exists: `curl http://localhost:8080/api/departments`
- Use correct department ID in INSERT statements

### Issue: "Email already exists"
- The email is unique; update existing user or use different email

### Issue: "Invalid channel_type"
- Use only: `whatsapp`, `instagram`, `facebook`, `telegram`

### Issue: "External ID already exists"
- Don't insert duplicate external_id values

---

## Next Steps

1. ✅ Clean database (done)
2. ✅ Populate departments and users
3. ✅ Configure messaging channels
4. ✅ Add your contacts
5. Start receiving real messages via webhooks
6. View conversations in dashboard
