-- Add waba_id column to channels table for WhatsApp Business Account ID
ALTER TABLE channels ADD COLUMN IF NOT EXISTS waba_id TEXT;
