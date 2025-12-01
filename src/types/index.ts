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
