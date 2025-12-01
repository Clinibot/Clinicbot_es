/*
  # Create Cal.com Integration Tables

  1. New Tables
    - `calcom_config`
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, foreign key to clinics, unique)
      - `api_key` (text, encrypted - Cal.com API key)
      - `enabled` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `calcom_event_types`
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, foreign key to clinics)
      - `agent_id` (uuid, foreign key to agents, nullable - which agents can use this)
      - `external_event_id` (integer - Cal.com event type ID)
      - `event_name` (text)
      - `duration_minutes` (integer)
      - `description` (text, nullable)
      - `enabled` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their clinic's Cal.com configuration
*/

CREATE TABLE IF NOT EXISTS calcom_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE UNIQUE NOT NULL,
  api_key text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calcom_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  external_event_id integer NOT NULL,
  event_name text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  description text,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calcom_event_types_clinic_id ON calcom_event_types(clinic_id);
CREATE INDEX IF NOT EXISTS idx_calcom_event_types_agent_id ON calcom_event_types(agent_id);

ALTER TABLE calcom_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE calcom_event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their clinic's Cal.com config"
  ON calcom_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = calcom_config.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their clinic's Cal.com config"
  ON calcom_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = calcom_config.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their clinic's Cal.com config"
  ON calcom_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = calcom_config.clinic_id
      AND clinics.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = calcom_config.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their clinic's Cal.com event types"
  ON calcom_event_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = calcom_event_types.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their clinic's Cal.com event types"
  ON calcom_event_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = calcom_event_types.clinic_id
      AND clinics.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = calcom_event_types.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );