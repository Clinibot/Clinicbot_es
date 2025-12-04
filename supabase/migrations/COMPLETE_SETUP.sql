-- ============================================
-- SCRIPT COMPLETO DE MIGRACIÓN
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- 1. Crear tabla phone_requests si no existe
CREATE TABLE IF NOT EXISTS phone_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  phone_number VARCHAR(50),
  request_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Crear tabla phone_numbers si no existe
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

-- 3. Crear índices
CREATE INDEX IF NOT EXISTS idx_phone_requests_clinic_id ON phone_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_phone_requests_user_id ON phone_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_requests_agent_id ON phone_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_phone_requests_status ON phone_requests(status);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_clinic_id ON phone_numbers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_phone_number ON phone_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_assigned_inbound ON phone_numbers(assigned_inbound_agent_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_assigned_outbound ON phone_numbers(assigned_outbound_agent_id);

-- 4. Crear funciones de trigger para updated_at
CREATE OR REPLACE FUNCTION update_phone_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_phone_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear triggers
DROP TRIGGER IF EXISTS trigger_update_phone_requests_updated_at ON phone_requests;
CREATE TRIGGER trigger_update_phone_requests_updated_at
  BEFORE UPDATE ON phone_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_requests_updated_at();

DROP TRIGGER IF EXISTS trigger_update_phone_numbers_updated_at ON phone_numbers;
CREATE TRIGGER trigger_update_phone_numbers_updated_at
  BEFORE UPDATE ON phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_numbers_updated_at();

-- 6. Actualizar contraseña del administrador
UPDATE auth.users
SET
  encrypted_password = crypt('123admin', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'sonia@sonia.com';

-- 7. Verificar tablas creadas
SELECT
  'phone_requests' as table_name,
  COUNT(*) as row_count
FROM phone_requests
UNION ALL
SELECT
  'phone_numbers' as table_name,
  COUNT(*) as row_count
FROM phone_numbers;
