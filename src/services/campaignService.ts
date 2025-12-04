import { supabase } from '../lib/supabase';
import { Campaign, CampaignExecution, CampaignContact } from '../types';

/**
 * Get all campaigns for a clinic
 */
export async function getClinicCampaigns(clinicId: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      agent:agents(id, name, agent_type),
      executions:campaign_executions(
        id,
        scheduled_for,
        executed_at,
        status,
        total_contacts,
        successful_calls,
        failed_calls,
        created_at
      )
    `)
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single campaign with all its executions and contacts
 */
export async function getCampaign(campaignId: string): Promise<Campaign | null> {
  const { data, error} = await supabase
    .from('campaigns')
    .select(`
      *,
      agent:agents(id, name, agent_type, retell_agent_id),
      executions:campaign_executions(
        *,
        contacts:campaign_contacts(*)
      )
    `)
    .eq('id', campaignId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new campaign
 */
export async function createCampaign(
  clinicId: string,
  name: string,
  agentId: string,
  description?: string
): Promise<Campaign> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('campaigns')
    .insert([{
      clinic_id: clinicId,
      name,
      description,
      agent_id: agentId,
      created_by: user.id,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  campaignId: string,
  updates: Partial<Pick<Campaign, 'name' | 'description' | 'agent_id'>>
): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('id', campaignId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(campaignId: string): Promise<void> {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId);

  if (error) throw error;
}

/**
 * Create a campaign execution (immediate or scheduled)
 */
export async function createCampaignExecution(
  campaignId: string,
  contacts: Array<{ phone: string; name?: string }>,
  scheduledFor?: Date
): Promise<CampaignExecution> {
  const { data, error } = await supabase
    .from('campaign_executions')
    .insert([{
      campaign_id: campaignId,
      scheduled_for: scheduledFor?.toISOString(),
      status: scheduledFor ? 'scheduled' : 'pending',
      total_contacts: contacts.length,
    }])
    .select()
    .single();

  if (error) throw error;

  // Insert all contacts
  const { error: contactsError } = await supabase
    .from('campaign_contacts')
    .insert(
      contacts.map(contact => ({
        campaign_execution_id: data.id,
        phone: contact.phone,
        name: contact.name,
      }))
    );

  if (contactsError) throw contactsError;

  return data;
}

/**
 * Get execution details with contacts
 */
export async function getCampaignExecution(executionId: string): Promise<CampaignExecution | null> {
  const { data, error } = await supabase
    .from('campaign_executions')
    .select(`
      *,
      campaign:campaigns(id, name, agent_id, agent:agents(id, name, retell_agent_id)),
      contacts:campaign_contacts(*)
    `)
    .eq('id', executionId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update execution status
 */
export async function updateExecutionStatus(
  executionId: string,
  status: CampaignExecution['status'],
  stats?: { successful_calls?: number; failed_calls?: number; executed_at?: Date }
): Promise<CampaignExecution> {
  const updates: any = { status };

  if (stats?.successful_calls !== undefined) updates.successful_calls = stats.successful_calls;
  if (stats?.failed_calls !== undefined) updates.failed_calls = stats.failed_calls;
  if (stats?.executed_at) updates.executed_at = stats.executed_at.toISOString();

  const { data, error } = await supabase
    .from('campaign_executions')
    .update(updates)
    .eq('id', executionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update contact status after call
 */
export async function updateContactStatus(
  contactId: string,
  status: CampaignContact['status'],
  details?: { retell_call_id?: string; call_duration?: number; error_message?: string }
): Promise<CampaignContact> {
  const updates: any = { status };

  if (details?.retell_call_id) updates.retell_call_id = details.retell_call_id;
  if (details?.call_duration !== undefined) updates.call_duration = details.call_duration;
  if (details?.error_message) updates.error_message = details.error_message;

  const { data, error } = await supabase
    .from('campaign_contacts')
    .update(updates)
    .eq('id', contactId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get pending/scheduled executions that are ready to run
 */
export async function getPendingExecutions(): Promise<CampaignExecution[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('campaign_executions')
    .select(`
      *,
      campaign:campaigns(id, name, agent_id, agent:agents(id, name, retell_agent_id)),
      contacts:campaign_contacts(*)
    `)
    .in('status', ['pending', 'scheduled'])
    .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
    .order('scheduled_for', { ascending: true, nullsFirst: true });

  if (error) throw error;
  return data || [];
}
