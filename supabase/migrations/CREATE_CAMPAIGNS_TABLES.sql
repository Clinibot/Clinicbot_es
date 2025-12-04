-- =====================================================
-- CAMPAÑAS DE LLAMADAS
-- =====================================================
-- Este script crea las tablas necesarias para gestionar
-- campañas de llamadas reutilizables con historial

-- Tabla principal de campañas
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ejecuciones de campañas (cada vez que se lanza)
CREATE TABLE IF NOT EXISTS campaign_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, scheduled, executing, completed, failed
    total_contacts INTEGER NOT NULL DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contactos en cada ejecución
CREATE TABLE IF NOT EXISTS campaign_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_execution_id UUID NOT NULL REFERENCES campaign_executions(id) ON DELETE CASCADE,
    phone VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    retell_call_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, calling, completed, failed
    call_duration INTEGER, -- en segundos
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_campaigns_clinic ON campaigns(clinic_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_agent ON campaigns(agent_id);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_campaign ON campaign_executions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_status ON campaign_executions(status);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_scheduled ON campaign_executions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_execution ON campaign_contacts(campaign_execution_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON campaign_contacts(status);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_campaigns_updated_at();

CREATE TRIGGER campaign_executions_updated_at
    BEFORE UPDATE ON campaign_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_campaigns_updated_at();

CREATE TRIGGER campaign_contacts_updated_at
    BEFORE UPDATE ON campaign_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_campaigns_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE campaigns IS 'Plantillas de campañas reutilizables';
COMMENT ON TABLE campaign_executions IS 'Historial de ejecuciones de cada campaña';
COMMENT ON TABLE campaign_contacts IS 'Contactos y resultados de cada ejecución';

COMMENT ON COLUMN campaign_executions.scheduled_for IS 'Fecha/hora programada para ejecutar (null = inmediato)';
COMMENT ON COLUMN campaign_executions.executed_at IS 'Fecha/hora real de ejecución';

-- Verificación
SELECT
    'campaigns' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'campaigns'
UNION ALL
SELECT
    'campaign_executions',
    COUNT(*)
FROM information_schema.columns
WHERE table_name = 'campaign_executions'
UNION ALL
SELECT
    'campaign_contacts',
    COUNT(*)
FROM information_schema.columns
WHERE table_name = 'campaign_contacts';
