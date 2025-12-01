/*
  # Add Google Calendar Integration

  1. Changes
    - Add `google_calendars` jsonb column to clinics table to store connected calendar information
    - Each calendar object will contain: { id, name, email, serviceType, enabled }

  2. Notes
    - The google_calendars field stores an array of calendar configurations
    - Each calendar can be assigned to specific services/specialties
    - Agents will use this information to book appointments
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics' AND column_name = 'google_calendars'
  ) THEN
    ALTER TABLE clinics ADD COLUMN google_calendars jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
