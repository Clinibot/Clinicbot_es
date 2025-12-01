/*
  # Create Call History and Analytics Tables

  1. New Tables
    - `call_history`
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, foreign key to clinics)
      - `agent_id` (uuid, foreign key to agents)
      - `external_call_id` (text, unique - the call ID from external API)
      - `caller_phone` (text)
      - `caller_name` (text, nullable)
      - `duration_seconds` (integer)
      - `call_type` (text - inbound/outbound)
      - `call_status` (text - completed, missed, etc)
      - `transcript` (text, nullable)
      - `recording_url` (text, nullable)
      - `summary` (text, nullable)
      - `intent` (text, nullable - what the caller wanted)
      - `external_cost` (decimal - cost from external API)
      - `user_cost` (decimal - cost with 20% markup)
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `metadata` (jsonb - for additional data)

  2. Indexes
    - Index on clinic_id for fast filtering
    - Index on agent_id for fast filtering
    - Index on external_call_id for fast lookups
    - Index on started_at for chronological queries

  3. Security
    - Enable RLS on call_history table
    - Add policy for authenticated users to read calls from their clinics
    - Add policy for system to insert/update call records
*/

CREATE TABLE IF NOT EXISTS call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  external_call_id text UNIQUE NOT NULL,
  caller_phone text NOT NULL,
  caller_name text,
  duration_seconds integer DEFAULT 0,
  call_type text NOT NULL DEFAULT 'inbound',
  call_status text NOT NULL DEFAULT 'completed',
  transcript text,
  recording_url text,
  summary text,
  intent text,
  external_cost decimal(10, 4) DEFAULT 0,
  user_cost decimal(10, 4) DEFAULT 0,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_call_history_clinic_id ON call_history(clinic_id);
CREATE INDEX IF NOT EXISTS idx_call_history_agent_id ON call_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_history_external_call_id ON call_history(external_call_id);
CREATE INDEX IF NOT EXISTS idx_call_history_started_at ON call_history(started_at DESC);

ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view call history from their clinics"
  ON call_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = call_history.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert call records"
  ON call_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = call_history.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "System can update call records"
  ON call_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = call_history.clinic_id
      AND clinics.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = call_history.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );