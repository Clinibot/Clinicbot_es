export interface Clinic {
  id: string;
  user_id: string;
  name: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  specialties: string[];
  opening_hours?: Record<string, { open: string; close: string }>;
  additional_info?: string;
  created_at: string;
  updated_at: string;
}

export interface ClinicStaff {
  id: string;
  clinic_id: string;
  name: string;
  specialty?: string;
  schedule?: Record<string, { start: string; end: string }>;
  created_at: string;
}

export interface SuccessMetric {
  id: string;
  name: string;
  type: 'boolean' | 'duration' | 'text';
  custom_data_key?: string; // Para métricas de custom data
  min_duration?: number; // Para métricas de duración (en segundos)
  expected_value?: string; // Para métricas de texto
}

export interface CustomFunction {
  id: string;
  name: string; // Nombre de la función que el agente ejecutará (ej: "agendar_cita")
  display_name: string; // Nombre para mostrar (ej: "Agendar Cita en CRM")
  description: string; // Descripción de qué hace y qué parámetros espera
  webhook_url: string; // URL del webhook a llamar
  api_key?: string; // API key o contraseña para autenticación
  enabled: boolean;
}

export interface Agent {
  id: string;
  clinic_id: string;
  retell_agent_id: string;
  agent_type: 'inbound' | 'outbound';
  name: string;
  prompt: string;
  voice_id: string;
  language: string;
  enabled: boolean;
  transfers?: Array<{
    name: string;
    phone: string;
    description: string;
    type: 'phone' | 'agent';
    agent_id?: string;
  }>;
  success_metrics?: SuccessMetric[];
  custom_functions?: CustomFunction[];
  created_at: string;
  updated_at: string;
}

export interface AgentTransfer {
  id: string;
  agent_id: string;
  trigger_number: number;
  trigger_condition: string;
  transfer_phone: string;
  transfer_name?: string;
  created_at: string;
}

export interface ScrapedClinicInfo {
  specialties: string[];
  doctors: Array<{ name: string; specialty: string }>;
  opening_hours: Record<string, { open: string; close: string }>;
  address?: string;
  phone?: string;
  additional_info?: string;
}

export interface CallRecipient {
  phone: string;
  name?: string;
  call_status?: 'pending' | 'calling' | 'completed' | 'failed';
  call_id?: string;
  call_result?: string;
}

export interface Campaign {
  id: string;
  clinic_id: string;
  agent_id: string;
  name: string;
  description?: string;
  scheduled_for: string; // ISO datetime
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  recipients: CallRecipient[];
  created_at: string;
  updated_at: string;
}

export interface PhoneRequest {
  id: string;
  clinic_id: string;
  user_id: string;
  agent_id?: string;
  user_name?: string;
  user_email?: string;
  status: 'pending' | 'approved' | 'rejected';
  phone_number?: string;
  request_notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PhoneNumber {
  id: string;
  clinic_id: string;
  phone_number: string;
  country: string;
  status: 'active' | 'inactive' | 'cancelled';
  assigned_inbound_agent_id?: string;
  assigned_outbound_agent_id?: string;
  monthly_cost?: number;
  purchased_at: string;
  created_at: string;
  updated_at: string;
}
