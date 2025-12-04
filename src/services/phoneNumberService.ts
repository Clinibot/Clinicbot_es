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
  try {
    // First, verify the phone number exists in Retell AI
    console.log('Verificando que el número existe en Retell AI...');
    const { getRetellPhoneNumber } = await import('./retellService');

    try {
      const retellPhone = await getRetellPhoneNumber(data.phone_number);
      console.log('✓ Número encontrado en Retell AI:', retellPhone);
    } catch (phoneError) {
      console.error('❌ El número no existe en Retell AI:', phoneError);
      // Rollback Supabase change
      await supabase
        .from('phone_numbers')
        .update({
          [field]: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', phoneNumberId);

      throw new Error(
        `❌ El número ${data.phone_number} NO está registrado en Retell AI.\n\n` +
        '📋 Pasos para solucionar:\n\n' +
        '1. Ve a tu dashboard de Retell AI: https://dashboard.retellai.com/\n' +
        '2. Navega a la sección "Phone Numbers"\n' +
        '3. Verifica que el número esté comprado/registrado ahí\n' +
        '4. Si no aparece, compra o importa el número desde Retell AI primero\n' +
        '5. Una vez que el número esté en Retell AI, vuelve aquí y asigna el agente\n\n' +
        '⚠️ IMPORTANTE: El número debe estar comprado/registrado en Retell AI ANTES de poder asignarlo a un agente.'
      );
    }

    // Now assign the agent to the phone number
    await assignPhoneNumberToRetellAgent(data.phone_number, agent.retell_agent_id);
    console.log('✅ Phone assigned successfully in both Supabase and Retell AI');
  } catch (retellError) {
    console.error('❌ Failed to assign phone in Retell AI:', retellError);

    // If it's already our custom error, re-throw it
    if (retellError instanceof Error && retellError.message.includes('NO está registrado en Retell AI')) {
      throw retellError;
    }

    // Rollback Supabase change for other errors
    await supabase
      .from('phone_numbers')
      .update({
        [field]: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', phoneNumberId);

    throw new Error(
      `Error al asignar el número en Retell AI: ${retellError instanceof Error ? retellError.message : 'Error desconocido'}.\n\n` +
      'El número NO ha sido asignado. Por favor, verifica que el número esté correctamente configurado en tu panel de Retell AI.'
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
