/*
  # Create Clinics Table

  1. New Tables
    - `clinics`
      - `id` (uuid, primary key) - Unique identifier for the clinic
      - `user_id` (uuid, foreign key) - Owner of the clinic (references auth.users)
      - `name` (text, required) - Name of the clinic
      - `website` (text, optional) - Clinic website URL
      - `phone` (text, optional) - Contact phone number
      - `address` (text, optional) - Physical address
      - `city` (text, optional) - City location
      - `postal_code` (text, optional) - Postal/ZIP code
      - `specialties` (jsonb, default empty array) - Medical specialties offered
      - `opening_hours` (jsonb, default empty object) - Business hours by day
      - `additional_info` (text, optional) - Additional information about the clinic
      - `created_at` (timestamptz, default now()) - Record creation timestamp
      - `updated_at` (timestamptz, default now()) - Last update timestamp

  2. Security
    - Enable RLS on `clinics` table
    - Add policy for users to read their own clinics
    - Add policy for users to insert their own clinics
    - Add policy for users to update their own clinics
    - Add policy for users to delete their own clinics

  3. Indexes
    - Index on `user_id` for fast user clinic lookups
*/

CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  website text,
  phone text,
  address text,
  city text,
  postal_code text,
  specialties jsonb DEFAULT '[]'::jsonb,
  opening_hours jsonb DEFAULT '{}'::jsonb,
  additional_info text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clinics"
  ON clinics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clinics"
  ON clinics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clinics"
  ON clinics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clinics"
  ON clinics
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_clinics_user_id ON clinics(user_id);
CREATE INDEX IF NOT EXISTS idx_clinics_created_at ON clinics(created_at DESC);
