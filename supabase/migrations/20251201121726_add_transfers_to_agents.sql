/*
  # Add transfers field to agents table

  1. Changes
    - Add `transfers` JSONB column to `agents` table to store transfer configurations
    - The transfers field will store an array of objects with name, phone, and description
  
  2. Notes
    - Uses JSONB for flexible transfer configuration storage
    - Allows agents to have multiple transfer destinations
    - Default value is empty array
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'transfers'
  ) THEN
    ALTER TABLE agents ADD COLUMN transfers JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;
