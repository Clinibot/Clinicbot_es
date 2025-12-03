-- Add custom_functions column to agents table
-- This column stores webhook configurations for external integrations
-- Each custom function has: id, name, display_name, description, webhook_url, api_key, and enabled

ALTER TABLE agents
ADD COLUMN IF NOT EXISTS custom_functions JSONB DEFAULT '[]'::jsonb;

-- Add a comment to explain the column
COMMENT ON COLUMN agents.custom_functions IS 'Array of custom function configurations for external webhooks. Each function has: id, name (function_name), display_name, description, webhook_url, api_key (optional), and enabled (boolean)';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_agents_custom_functions ON agents USING GIN (custom_functions);
