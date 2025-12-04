-- ============================================
-- Add missing columns to agents table
-- Execute this in Supabase SQL Editor
-- ============================================

-- Add success_metrics column (JSONB array)
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS success_metrics JSONB DEFAULT '[]'::jsonb;

-- Add custom_functions column (JSONB array)
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS custom_functions JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN agents.success_metrics IS 'Array of success metric definitions for measuring call success';
COMMENT ON COLUMN agents.custom_functions IS 'Array of custom webhook function definitions for external integrations';

-- Verify the columns were added
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'agents'
AND column_name IN ('success_metrics', 'custom_functions')
ORDER BY column_name;
