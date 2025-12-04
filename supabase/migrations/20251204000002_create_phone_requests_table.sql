-- Create phone_requests table to manage phone number requests
-- Admin users can approve/reject requests and assign phone numbers

CREATE TABLE IF NOT EXISTS phone_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  phone_number VARCHAR(50), -- Assigned phone number (when approved)
  request_notes TEXT, -- User notes when requesting
  admin_notes TEXT, -- Admin notes when approving/rejecting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add comment to explain the table
COMMENT ON TABLE phone_requests IS 'Stores phone number requests from users that admins can approve/reject';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_phone_requests_clinic_id ON phone_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_phone_requests_user_id ON phone_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_requests_status ON phone_requests(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_phone_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_phone_requests_updated_at
  BEFORE UPDATE ON phone_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_requests_updated_at();
