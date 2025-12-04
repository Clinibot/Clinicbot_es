-- Update phone_requests table to include agent_id and user info
ALTER TABLE phone_requests
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS user_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);

-- Add comment
COMMENT ON COLUMN phone_requests.agent_id IS 'The specific agent this phone number is requested for';
COMMENT ON COLUMN phone_requests.user_name IS 'Name of the user making the request';
COMMENT ON COLUMN phone_requests.user_email IS 'Email of the user making the request';

-- Create phone_numbers table to store purchased phone numbers
CREATE TABLE IF NOT EXISTS phone_numbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  phone_number VARCHAR(50) NOT NULL UNIQUE,
  country VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
  assigned_inbound_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  assigned_outbound_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  monthly_cost DECIMAL(10,2),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add comments
COMMENT ON TABLE phone_numbers IS 'Stores purchased phone numbers for clinics';
COMMENT ON COLUMN phone_numbers.assigned_inbound_agent_id IS 'The inbound agent assigned to receive calls on this number (only one allowed)';
COMMENT ON COLUMN phone_numbers.assigned_outbound_agent_id IS 'The outbound agent assigned to make calls from this number (only one allowed)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_phone_numbers_clinic_id ON phone_numbers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_phone_number ON phone_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_assigned_inbound ON phone_numbers(assigned_inbound_agent_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_assigned_outbound ON phone_numbers(assigned_outbound_agent_id);
CREATE INDEX IF NOT EXISTS idx_phone_requests_agent_id ON phone_requests(agent_id);

-- Create updated_at trigger for phone_numbers
CREATE OR REPLACE FUNCTION update_phone_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_phone_numbers_updated_at
  BEFORE UPDATE ON phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_numbers_updated_at();
