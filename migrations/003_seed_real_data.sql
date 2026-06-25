-- =============================================================================
-- OmniChat — Migration 003: Real Data Seeding
-- Created: 2026-06-25
-- Description: Template for seeding your actual business data.
--              Replace placeholder values with your real departments, users,
--              channels, and contacts.
-- =============================================================================

BEGIN;

-- ===========================================================================
-- STEP 1: Add Departments
-- ===========================================================================
-- Replace these with your actual departments
INSERT INTO departments (name, description, routing_mode, is_active) VALUES
    -- ('Your Department Name', 'Description', 'round_robin' or 'manual', true/false),
    -- Example:
    -- ('Support', 'Customer support team', 'round_robin', TRUE),
    -- ('Sales', 'Sales team', 'manual', TRUE),
ON CONFLICT (name) DO NOTHING;

-- ===========================================================================
-- STEP 2: Add Users
-- ===========================================================================
-- Replace with your actual team members
-- Roles: 'admin', 'supervisor', or 'agent'
INSERT INTO users (email, name, role, department_id, is_active) VALUES
    -- ('user@example.com', 'User Name', 'agent', (SELECT id FROM departments WHERE name = 'Your Department'), TRUE),
    -- Example:
    -- ('john.smith@company.com', 'John Smith', 'supervisor', (SELECT id FROM departments WHERE name = 'Support'), TRUE),
    -- ('jane.doe@company.com', 'Jane Doe', 'agent', (SELECT id FROM departments WHERE name = 'Support'), TRUE),
ON CONFLICT (email) DO NOTHING;

-- ===========================================================================
-- STEP 3: Add Messaging Channels
-- ===========================================================================
-- Configure your WhatsApp, Instagram, Facebook, and other channels
-- Channel types: 'whatsapp', 'instagram', 'facebook', 'telegram', etc.

-- WhatsApp Channels (requires phone_number and external_id)
INSERT INTO channels (name, channel_type, phone_number, external_id, webhook_verify_token, is_active) VALUES
    -- ('Channel Name', 'whatsapp', '+1234567890', 'waba_id', 'webhook_token', TRUE),
    -- Example:
    -- ('WhatsApp Business', 'whatsapp', '+1 555 123 4567', 'waba_business', 'verify_token_1', TRUE),
ON CONFLICT DO NOTHING;

-- Instagram/Facebook Channels (requires page_id and external_id)
INSERT INTO channels (name, channel_type, page_id, external_id, webhook_verify_token, is_active) VALUES
    -- ('Channel Name', 'instagram', 'page_id', 'external_id', 'webhook_token', TRUE),
    -- Example:
    -- ('Instagram Business', 'instagram', 'ig_page_12345', 'ig_external_1', 'verify_token_2', TRUE),
    -- ('Facebook Page', 'facebook', 'fb_page_67890', 'fb_external_1', 'verify_token_3', TRUE),
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- STEP 4: Add Contacts
-- ===========================================================================
-- Add your customers/contacts that will have conversations
-- channel_type should match your configured channels above
INSERT INTO contacts (name, phone, email, channel_type, external_id) VALUES
    -- ('Contact Name', '+1234567890', 'email@example.com', 'whatsapp', 'external_id'),
    -- Example:
    -- ('John Customer', '+1 555 987 6543', 'john@customer.com', 'whatsapp', 'wc_123'),
    -- ('Jane Contact', '+1 555 654 3210', 'jane@customer.com', 'instagram', 'ic_456'),
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- STEP 5: Add Conversations (Optional - can be created via UI)
-- ===========================================================================
-- Conversations link contacts to departments and assign agents
-- INSERT INTO conversations (contact_id, channel_id, department_id, assigned_agent_id, status) VALUES
    -- ((SELECT id FROM contacts WHERE external_id = 'external_id'),
    --  (SELECT id FROM channels WHERE name = 'Channel Name'),
    --  (SELECT id FROM departments WHERE name = 'Department Name'),
    --  (SELECT id FROM users WHERE email = 'agent@example.com'),
    --  'open'),
-- ON CONFLICT DO NOTHING;

COMMIT;

-- ===========================================================================
-- NOTES:
-- ===========================================================================
-- 1. Run this migration with: pnpm --filter @workspace/db run push
-- 2. Make sure to fill in the VALUES clauses with your real data
-- 3. Don't add comma after the last VALUES row
-- 4. The ON CONFLICT DO NOTHING prevents errors if data already exists
-- 5. Use the SELECT subqueries to reference IDs by name, not hardcoded IDs
-- 6. For testing, you can add example data to the template above
