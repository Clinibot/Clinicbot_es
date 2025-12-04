import { supabase } from '../lib/supabase';
import { Campaign, CallRecipient } from '../types';

export async function createCampaign(
  clinicId: string,
  agentId: string,
  name: string,
  scheduledFor: string,
  recipients: CallRecipient[],
  description?: string
): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert([{
      clinic_id: clinicId,
      agent_id: agentId,
      name,
      description,
      scheduled_for: scheduledFor,
      status: 'pending',
      recipients,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCampaign(campaignId: string): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getClinicCampaigns(clinicId: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('scheduled_for', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAgentCampaigns(agentId: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('agent_id', agentId)
    .order('scheduled_for', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateCampaign(
  campaignId: string,
  updates: Partial<Campaign>
): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', campaignId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCampaignStatus(
  campaignId: string,
  status: Campaign['status']
): Promise<Campaign> {
  return updateCampaign(campaignId, { status });
}

export async function updateRecipientStatus(
  campaignId: string,
  recipientPhone: string,
  status: CallRecipient['call_status'],
  callId?: string,
  callResult?: string
): Promise<Campaign> {
  // First get the campaign
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  // Update the specific recipient
  const updatedRecipients = campaign.recipients.map(recipient => {
    if (recipient.phone === recipientPhone) {
      return {
        ...recipient,
        call_status: status,
        ...(callId && { call_id: callId }),
        ...(callResult && { call_result: callResult }),
      };
    }
    return recipient;
  });

  return updateCampaign(campaignId, { recipients: updatedRecipients });
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId);

  if (error) throw error;
}

export async function getPendingCampaigns(): Promise<Campaign[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true });

  if (error) throw error;
  return data || [];
}
