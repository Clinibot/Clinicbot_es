-- Add success_metrics column to agents table
-- This column stores custom success metrics for each agent
-- Metrics can be boolean, duration-based, or text-based

ALTER TABLE agents
ADD COLUMN IF NOT EXISTS success_metrics JSONB DEFAULT '[]'::jsonb;

-- Add a comment to explain the column
COMMENT ON COLUMN agents.success_metrics IS 'Array of success metrics configuration. Each metric has: id, name, type (boolean/duration/text), and optional custom_data_key, min_duration, or expected_value fields';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_agents_success_metrics ON agents USING GIN (success_metrics);
