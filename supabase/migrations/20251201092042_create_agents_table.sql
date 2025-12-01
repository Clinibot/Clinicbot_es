/*
  # Create Agents Table

  1. New Tables
    - `agents`
      - `id` (uuid, primary key) - Unique identifier for the agent
      - `clinic_id` (uuid, foreign key) - Associated clinic (references clinics)
      - `retell_agent_id` (text, required) - Retell AI agent identifier
      - `agent_type` (text, required) - Type: 'inbound' or 'outbound'
      - `name` (text, required) - Agent name
      - `prompt` (text, required) - Agent system prompt/instructions
      - `voice_id` (text, required) - Voice identifier (e.g., '11labs-Alice')
      - `language` (text, required, default 'es') - Language code
      - `enabled` (boolean, default true) - Whether agent is active
      - `created_at` (timestamptz, default now()) - Record creation timestamp
      - `updated_at` (timestamptz, default now()) - Last update timestamp

  2. Security
    - Enable RLS on `agents` table
    - Add policy for users to view agents of their clinics
    - Add policy for users to create agents for their clinics
    - Add policy for users to update agents of their clinics
    - Add policy for users to delete agents of their clinics

  3. Indexes
    - Index on `clinic_id` for fast clinic agent lookups
    - Index on `agent_type` for filtering by type
    - Index on `enabled` for filtering active agents

  4. Constraints
    - Check constraint to ensure agent_type is either 'inbound' or 'outbound'
*/

CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  retell_agent_id text NOT NULL,
  agent_type text NOT NULL CHECK (agent_type IN ('inbound', 'outbound')),
  name text NOT NULL,
  prompt text NOT NULL,
  voice_id text NOT NULL,
  language text NOT NULL DEFAULT 'es',
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agents of their clinics"
  ON agents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = agents.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create agents for their clinics"
  ON agents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = agents.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update agents of their clinics"
  ON agents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = agents.clinic_id
      AND clinics.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = agents.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete agents of their clinics"
  ON agents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = agents.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_agents_clinic_id ON agents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_agents_enabled ON agents(enabled);
CREATE INDEX IF NOT EXISTS idx_agents_retell_id ON agents(retell_agent_id);
