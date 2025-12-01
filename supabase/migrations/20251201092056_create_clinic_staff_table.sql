/*
  # Create Clinic Staff Table

  1. New Tables
    - `clinic_staff`
      - `id` (uuid, primary key) - Unique identifier
      - `clinic_id` (uuid, foreign key) - Associated clinic (references clinics)
      - `name` (text, required) - Staff member name (doctor, nurse, etc.)
      - `specialty` (text, optional) - Medical specialty
      - `schedule` (jsonb, optional) - Weekly schedule by day
      - `created_at` (timestamptz, default now()) - Record creation timestamp

  2. Security
    - Enable RLS on `clinic_staff` table
    - Add policy for users to view staff of their clinics
    - Add policy for users to create staff for their clinics
    - Add policy for users to update staff of their clinics
    - Add policy for users to delete staff of their clinics

  3. Indexes
    - Index on `clinic_id` for fast clinic staff lookups
*/

CREATE TABLE IF NOT EXISTS clinic_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  specialty text,
  schedule jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clinic_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view staff of their clinics"
  ON clinic_staff
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_staff.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create staff for their clinics"
  ON clinic_staff
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_staff.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update staff of their clinics"
  ON clinic_staff
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_staff.clinic_id
      AND clinics.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_staff.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete staff of their clinics"
  ON clinic_staff
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_staff.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_clinic_staff_clinic_id ON clinic_staff(clinic_id);
