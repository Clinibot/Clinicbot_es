import { supabase } from '../lib/supabase';
import { PhoneNumber } from '../types';
import { assignPhoneNumberToRetellAgent, unassignPhoneNumberFromRetellAgent } from './retellService';
import { getAgent } from './agentService';

export async function createPhoneNumber(
  clinicId: string,
  phoneNumber: string,
  country: string,
  monthlyCost?: number
): Promise<PhoneNumber> {
  const { data, error } = await supabase
    .from('phone_numbers')
    .insert([{
      clinic_id: clinicId,
      phone_number: phoneNumber,
      country,
      status: 'active',
      monthly_cost: monthlyCost,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPhoneNumber(phoneNumberId: string): Promise<PhoneNumber | null> {
  const { data, error } = await supabase
    .from('phone_numbers')
    .select('*')
    .eq('id', phoneNumberId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getClinicPhoneNumbers(clinicId: string): Promise<PhoneNumber[]> {
  const { data, error } = await supabase
    .from('phone_numbers')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAvailablePhoneNumbersForAgent(
  clinicId: string,
  agentType: 'inbound' | 'outbound'
): Promise<PhoneNumber[]> {
  const { data, error } = await supabase
    .from('phone_numbers')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('status', 'active')
    .is(agentType === 'inbound' ? 'assigned_inbound_agent_id' : 'assigned_outbound_agent_id', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function assignPhoneToAgent(
  phoneNumberId: string,
  agentId: string,
  agentType: 'inbound' | 'outbound'
): Promise<PhoneNumber> {
  console.log('=== Assigning Phone to Agent ===');
  console.log('Phone Number ID:', phoneNumberId);
  console.log('Agent ID:', agentId);
  console.log('Agent Type:', agentType);

  const field = agentType === 'inbound' ? 'assigned_inbound_agent_id' : 'assigned_outbound_agent_id';

  // Update in Supabase first
  const { data, error } = await supabase
    .from('phone_numbers')
    .update({
      [field]: agentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', phoneNumberId)
    .select()
    .single();

  if (error) throw error;

  // Get agent info to get Retell agent ID
  const agent = await getAgent(agentId);
  if (!agent) {
    throw new Error('Agent not found');
  }

  if (!agent.retell_agent_id) {
    console.warn('⚠️ Agent does not have a Retell agent ID, skipping Retell assignment');
    return data;
  }

  // Update in Retell AI
  console.log('🔄 PASO 3: Sincronizando con Retell AI...');
  console.log('   - Número a sincronizar:', data.phone_number);
  console.log('   - Retell Agent ID:', agent.retell_agent_id);
  console.log('   - Tipo de agente:', agentType);

  try {
    // Now assign the agent to the phone number
    console.log('📞 Llamando a update-phone-number de Retell AI...');
    await assignPhoneNumberToRetellAgent(data.phone_number, agent.retell_agent_id, agentType);
    console.log('✅ Phone assigned successfully in both Supabase and Retell AI');
    console.log('='.repeat(60));
  } catch (retellError) {
    console.error('❌ Failed to assign phone in Retell AI:', retellError);
    console.error('Error details:', JSON.stringify(retellError, null, 2));

    // Rollback Supabase change
    console.warn('⚠️ Haciendo rollback de la asignación en Supabase...');
    await supabase
      .from('phone_numbers')
      .update({
        [field]: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', phoneNumberId);

    throw new Error(
      `❌ Error al sincronizar con Retell AI\n\n` +
      `Detalles del error: ${retellError instanceof Error ? retellError.message : JSON.stringify(retellError)}\n\n` +
      `📋 Posibles causas:\n` +
      `1. El número ${data.phone_number} NO está comprado/registrado en Retell AI\n` +
      `2. La API key de Retell no tiene permisos suficientes\n` +
      `3. Problema de conectividad con Retell AI\n\n` +
      `🔧 Soluciones:\n` +
      `1. Ve a https://dashboard.retellai.com/ → "Phone Numbers"\n` +
      `2. Verifica que el número está comprado ahí\n` +
      `3. Usa el botón "Re-sincronizar" en Gestionar Teléfonos\n\n` +
      `⚠️ La asignación fue cancelada. El número NO ha sido asignado al agente.`
    );
  }

  return data;
}

export async function unassignPhoneFromAgent(
  phoneNumberId: string,
  agentType: 'inbound' | 'outbound'
): Promise<PhoneNumber> {
  console.log('=== Unassigning Phone from Agent ===');
  console.log('Phone Number ID:', phoneNumberId);
  console.log('Agent Type:', agentType);

  // Get the phone number first to retrieve the phone string
  const phoneNumber = await getPhoneNumber(phoneNumberId);
  if (!phoneNumber) {
    throw new Error('Phone number not found');
  }

  const field = agentType === 'inbound' ? 'assigned_inbound_agent_id' : 'assigned_outbound_agent_id';

  // Update in Retell AI first (unassign)
  try {
    await unassignPhoneNumberFromRetellAgent(phoneNumber.phone_number);
    console.log('✅ Phone unassigned successfully in Retell AI');
  } catch (retellError) {
    console.error('❌ Failed to unassign phone in Retell AI:', retellError);
    throw new Error(
      `Error al desasignar el número en Retell AI: ${retellError instanceof Error ? retellError.message : 'Error desconocido'}.\n\n` +
      'Por favor, verifica que el número esté correctamente configurado en tu panel de Retell AI.'
    );
  }

  // Update in Supabase
  const { data, error } = await supabase
    .from('phone_numbers')
    .update({
      [field]: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', phoneNumberId)
    .select()
    .single();

  if (error) throw error;

  console.log('✅ Phone unassigned successfully in both Retell AI and Supabase');
  return data;
}

export async function getAgentPhoneNumber(agentId: string, agentType: 'inbound' | 'outbound'): Promise<PhoneNumber | null> {
  const field = agentType === 'inbound' ? 'assigned_inbound_agent_id' : 'assigned_outbound_agent_id';

  const { data, error } = await supabase
    .from('phone_numbers')
    .select('*')
    .eq(field, agentId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updatePhoneNumberStatus(
  phoneNumberId: string,
  status: PhoneNumber['status']
): Promise<PhoneNumber> {
  const { data, error } = await supabase
    .from('phone_numbers')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', phoneNumberId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePhoneNumber(phoneNumberId: string): Promise<void> {
  const { error } = await supabase
    .from('phone_numbers')
    .delete()
    .eq('id', phoneNumberId);

  if (error) throw error;
}
