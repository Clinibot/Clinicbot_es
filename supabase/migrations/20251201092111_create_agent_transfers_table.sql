/*
  # Create Agent Transfers Table

  1. New Tables
    - `agent_transfers`
      - `id` (uuid, primary key) - Unique identifier
      - `agent_id` (uuid, foreign key) - Associated agent (references agents)
      - `trigger_number` (integer, required) - Trigger option number
      - `trigger_condition` (text, required) - Condition description for transfer
      - `transfer_phone` (text, required) - Phone number to transfer to
      - `transfer_name` (text, optional) - Name/description of transfer destination
      - `created_at` (timestamptz, default now()) - Record creation timestamp

  2. Security
    - Enable RLS on `agent_transfers` table
    - Add policy for users to view transfers of their agents
    - Add policy for users to create transfers for their agents
    - Add policy for users to update transfers of their agents
    - Add policy for users to delete transfers of their agents

  3. Indexes
    - Index on `agent_id` for fast agent transfer lookups
*/

CREATE TABLE IF NOT EXISTS agent_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  trigger_number integer NOT NULL,
  trigger_condition text NOT NULL,
  transfer_phone text NOT NULL,
  transfer_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agent_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transfers of their agents"
  ON agent_transfers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      JOIN clinics ON clinics.id = agents.clinic_id
      WHERE agents.id = agent_transfers.agent_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transfers for their agents"
  ON agent_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      JOIN clinics ON clinics.id = agents.clinic_id
      WHERE agents.id = agent_transfers.agent_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transfers of their agents"
  ON agent_transfers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      JOIN clinics ON clinics.id = agents.clinic_id
      WHERE agents.id = agent_transfers.agent_id
      AND clinics.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      JOIN clinics ON clinics.id = agents.clinic_id
      WHERE agents.id = agent_transfers.agent_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete transfers of their agents"
  ON agent_transfers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      JOIN clinics ON clinics.id = agents.clinic_id
      WHERE agents.id = agent_transfers.agent_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_agent_transfers_agent_id ON agent_transfers(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_transfers_trigger_number ON agent_transfers(trigger_number);
