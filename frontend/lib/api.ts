import {
  AgentResponse,
  Approval,
  CaseFile,
  Decision,
  Merchant,
  Metrics,
  Ticket,
  TicketDetail,
  TicketStatus,
  Tier,
  TraceEvent,
  LoginResponse,
} from './types';
import { mockEngine } from './mock/engine';
import { getAuthSession, setAuthSession, clearAuthSession } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
export const IS_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === undefined
    ? true
    : process.env.NEXT_PUBLIC_USE_MOCK === 'true' || process.env.NEXT_PUBLIC_USE_MOCK === '1';

// Headers with Bearer token
function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const session = getAuthSession();
  const headers: Record<string, string> = { ...extraHeaders };
  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }
  return headers;
}

// Check response for 401 Unauthorized and redirect
function checkAuthError(status: number): void {
  if (status === 401) {
    clearAuthSession();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }
}

// Normalizers for backend compatibility with docs/CONTRACTS.md
export function normalizeTier(rawTier: unknown, requiresConfirmation = false): Tier | null {
  if (rawTier === null || rawTier === undefined) return null;
  const s = String(rawTier).toUpperCase().trim();
  if (s === '1' || s === 'T1' || s === 'TIER_1' || s === 'TIER1') return 'T1';
  if (s === '2' || s === 'T2' || s === 'TIER_2' || s === 'TIER2') {
    return requiresConfirmation ? 'T2A' : 'T2B';
  }
  if (s === 'T2A' || s === '2A') return 'T2A';
  if (s === 'T2B' || s === '2B') return 'T2B';
  if (s === '3' || s === 'T3' || s === 'TIER_3' || s === 'TIER3') return 'T3';
  return 'T1';
}

export function normalizeStatus(rawStatus: unknown): TicketStatus {
  if (!rawStatus) return 'open';
  const s = String(rawStatus).toLowerCase().trim();
  if (s === 'resolved_auto' || s === 'resolved' || s === 'closed') return 'resolved';
  if (s === 'pending_approval' || s === 'awaiting_human') return 'awaiting_human';
  if (s === 'awaiting_merchant' || s === 'needs_confirm') return 'awaiting_merchant';
  if (s === 'escalated') return 'escalated';
  if (s === 'failed' || s === 'error') return 'failed';
  return 'open';
}

export function normalizeDecision(rawDecision: unknown): Decision {
  const s = String(rawDecision || '').toUpperCase().trim();
  if (s.includes('CONFIRM')) return 'NEEDS_MERCHANT_CONFIRM';
  if (s.includes('APPROVAL') || s.includes('APPROVE')) return 'NEEDS_HUMAN_APPROVAL';
  if (s.includes('ESCALATE')) return 'ESCALATE';
  return 'ALLOW';
}

// ─── Authentication API ──────────────────────────────────────────────────────

export async function loginMerchant(phone: string, otp: string = '123456'): Promise<LoginResponse> {
  if (IS_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    const res = mockEngine.loginMerchant(phone, otp);
    setAuthSession({
      token: res.access_token,
      role: 'merchant',
      merchant: res.merchant,
    });
    return {
      access_token: res.access_token,
      token_type: 'bearer',
      role: 'merchant',
      merchant: res.merchant,
    };
  }

  const res = await fetch(`${API_BASE_URL}/auth/merchant/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Login failed. Invalid phone or OTP.');
  }
  const data = await res.json();
  setAuthSession({
    token: data.access_token,
    role: 'merchant',
    merchant: data.merchant,
  });
  return data;
}

export async function loginAgent(otp: string = '123456'): Promise<LoginResponse> {
  if (IS_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    const res = mockEngine.loginAgent(otp);
    setAuthSession({
      token: res.access_token,
      role: 'agent',
      agent: res.user,
    });
    return {
      access_token: res.access_token,
      token_type: 'bearer',
      role: 'agent',
      user: res.user,
    };
  }

  const res = await fetch(`${API_BASE_URL}/auth/agent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Agent login failed.');
  }
  const data = await res.json();
  setAuthSession({
    token: data.access_token,
    role: 'agent',
    agent: data.user,
  });
  return data;
}

export function logout(): void {
  clearAuthSession();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

// ─── Scoped Merchant API ─────────────────────────────────────────────────────

export async function getMyProfile(): Promise<Merchant> {
  const session = getAuthSession();
  if (IS_MOCK) {
    const mId = session?.merchant?.id || 'm1';
    return mockEngine.getMerchant(mId);
  }
  try {
    const res = await fetch(`${API_BASE_URL}/me`, {
      headers: getAuthHeaders(),
    });
    checkAuthError(res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[getMyProfile] Fallback to mock session:', err);
    return session?.merchant || mockEngine.getMerchant('m1');
  }
}

export async function listMyTickets(): Promise<TicketDetail[]> {
  const session = getAuthSession();
  const merchantId = session?.merchant?.id || 'm1';
  if (IS_MOCK) {
    return mockEngine.listMyTickets(merchantId);
  }
  try {
    const res = await fetch(`${API_BASE_URL}/me/tickets`, {
      headers: getAuthHeaders(),
    });
    checkAuthError(res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawList = await res.json();
    return (Array.isArray(rawList) ? rawList : []).map((t: any) => ({
      id: t.id || t.ticket_id,
      merchant_id: t.merchant_id,
      status: normalizeStatus(t.status),
      tier: normalizeTier(t.tier),
      source: t.source || 'merchant',
      language: t.language || 'hi',
      summary: t.summary || 'Support query',
      created_at: t.created_at || new Date().toISOString(),
      resolved_at: t.resolved_at || null,
      merchant: t.merchant || session?.merchant || mockEngine.getMerchant(merchantId),
      events: t.events || [],
    }));
  } catch (err) {
    console.warn('[listMyTickets] Fallback to mock engine:', err);
    return mockEngine.listMyTickets(merchantId);
  }
}

export async function getMyTicket(ticketId: string): Promise<TicketDetail> {
  const session = getAuthSession();
  const merchantId = session?.merchant?.id || 'm1';
  if (IS_MOCK) {
    return mockEngine.getMyTicket(ticketId, merchantId);
  }
  const res = await fetch(`${API_BASE_URL}/me/tickets/${ticketId}`, {
    headers: getAuthHeaders(),
  });
  checkAuthError(res.status);
  if (res.status === 404) {
    throw new Error('Ticket not found.');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const t = await res.json();
  return {
    id: t.id || t.ticket_id || ticketId,
    merchant_id: t.merchant_id,
    status: normalizeStatus(t.status),
    tier: normalizeTier(t.tier),
    source: t.source || 'merchant',
    language: t.language || 'hi',
    summary: t.summary || 'Support query',
    created_at: t.created_at || new Date().toISOString(),
    resolved_at: t.resolved_at || null,
    merchant: t.merchant || session?.merchant || mockEngine.getMerchant(merchantId),
    events: t.events || [],
  };
}

export async function getMerchant(id: string): Promise<Merchant> {
  if (IS_MOCK) {
    return mockEngine.getMerchant(id);
  }
  try {
    const res = await fetch(`${API_BASE_URL}/mock/merchants/${id}`).catch(() =>
      fetch(`${API_BASE_URL}/merchants/${id}`)
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      id: data.id || id,
      name: data.name || 'Merchant',
      city: data.city || 'India',
      phone: data.phone,
      soundbox_id: data.soundbox_id || data.device_id || `SB-${id.toUpperCase()}`,
      device_status: data.device_status || data.status || 'online',
      last_heartbeat: data.last_heartbeat,
    };
  } catch (err) {
    console.warn(`[getMerchant] Live fetch failed, fallback to mock:`, err);
    return mockEngine.getMerchant(id);
  }
}

export async function sendText(
  merchantId: string,
  text: string,
  language: string = 'hi'
): Promise<AgentResponse> {
  if (IS_MOCK) {
    await new Promise((r) => setTimeout(r, 700));
    return mockEngine.processMessage(merchantId, text, language);
  }
  try {
    const res = await fetch(`${API_BASE_URL}/text`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text, language }),
    });
    checkAuthError(res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const reqConfirm = Boolean(data.requires_confirmation || data.needs_confirm);
    return {
      ticket_id: data.ticket_id || `t-${Date.now()}`,
      transcript: data.transcript ?? text,
      language: data.language || language,
      stt_confidence: data.confidence ?? data.stt_confidence ?? 0.95,
      reply_text: data.reply_text || data.text || '',
      reply_audio_url: data.reply_audio_url || null,
      tier: normalizeTier(data.tier, reqConfirm),
      status: normalizeStatus(data.status),
      requires_confirmation: reqConfirm,
      evidence: data.evidence || [],
    };
  } catch (err) {
    console.warn(`[sendText] Live call failed, fallback to mock:`, err);
    return mockEngine.processMessage(merchantId, text, language);
  }
}

export async function sendVoice(
  merchantId: string,
  audioBlob: Blob,
  language: string = 'hi'
): Promise<AgentResponse> {
  if (IS_MOCK) {
    await new Promise((r) => setTimeout(r, 900));
    return mockEngine.processMessage(merchantId, 'Mera Soundbox kal se nahi bol raha', language);
  }
  try {
    const form = new FormData();
    form.append('audio', audioBlob, 'voice.wav');
    form.append('language_hint', language);

    const res = await fetch(`${API_BASE_URL}/voice`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: form,
    });
    checkAuthError(res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const reqConfirm = Boolean(data.requires_confirmation || data.needs_confirm);
    return {
      ticket_id: data.ticket_id || `t-${Date.now()}`,
      transcript: data.transcript,
      language: data.language || language,
      stt_confidence: data.confidence ?? data.stt_confidence ?? null,
      reply_text: data.reply_text || '',
      reply_audio_url: data.reply_audio_url || null,
      tier: normalizeTier(data.tier, reqConfirm),
      status: normalizeStatus(data.status),
      requires_confirmation: reqConfirm,
      evidence: data.evidence || [],
    };
  } catch (err) {
    console.warn(`[sendVoice] Live call failed, fallback to mock:`, err);
    return mockEngine.processMessage(merchantId, 'Mera Soundbox kal se nahi bol raha', language);
  }
}

export async function confirmTicket(
  ticketId: string,
  answer: 'yes' | 'no'
): Promise<AgentResponse> {
  if (IS_MOCK) {
    await new Promise((r) => setTimeout(r, 700));
    return mockEngine.confirmTicket(ticketId, answer);
  }
  try {
    const res = await fetch(`${API_BASE_URL}/me/tickets/${ticketId}/confirm`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ answer }),
    });
    checkAuthError(res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      ticket_id: data.ticket_id || ticketId,
      transcript: answer,
      language: data.language || 'hi',
      stt_confidence: 1.0,
      reply_text: data.reply_text || (answer === 'yes' ? 'Soundbox is now online.' : 'Cancelled.'),
      reply_audio_url: data.reply_audio_url || null,
      tier: normalizeTier(data.tier),
      status: normalizeStatus(data.status),
      requires_confirmation: false,
    };
  } catch (err) {
    console.warn(`[confirmTicket] Live call failed, fallback to mock:`, err);
    return mockEngine.confirmTicket(ticketId, answer);
  }
}

// ─── Agent Console Endpoints ─────────────────────────────────────────────────

export async function listTickets(params?: {
  status?: string;
  merchant_id?: string;
}): Promise<TicketDetail[]> {
  if (IS_MOCK) {
    return mockEngine.listTickets(params);
  }
  try {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.merchant_id) query.set('merchant_id', params.merchant_id);

    const res = await fetch(`${API_BASE_URL}/tickets?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    checkAuthError(res.status);
    if (res.status === 403) throw new Error('Agent access required (403)');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawList = await res.json();
    return (Array.isArray(rawList) ? rawList : []).map((t: any) => ({
      id: t.id || t.ticket_id,
      merchant_id: t.merchant_id,
      status: normalizeStatus(t.status),
      tier: normalizeTier(t.tier),
      source: t.source || 'merchant',
      language: t.language || 'hi',
      summary: t.summary || 'Support query',
      created_at: t.created_at || new Date().toISOString(),
      resolved_at: t.resolved_at || null,
      merchant: t.merchant || mockEngine.getMerchant(t.merchant_id),
      events: t.events || [],
    }));
  } catch (err) {
    console.warn(`[listTickets] Live fetch failed, fallback to mock:`, err);
    return mockEngine.listTickets(params);
  }
}

export async function getTicket(id: string): Promise<TicketDetail | null> {
  if (IS_MOCK) {
    return mockEngine.getTicket(id) || null;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/tickets/${id}`, {
      headers: getAuthHeaders(),
    });
    checkAuthError(res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const t = await res.json();
    return {
      id: t.id || t.ticket_id || id,
      merchant_id: t.merchant_id,
      status: normalizeStatus(t.status),
      tier: normalizeTier(t.tier),
      source: t.source || 'merchant',
      language: t.language || 'hi',
      summary: t.summary || 'Support query',
      created_at: t.created_at || new Date().toISOString(),
      resolved_at: t.resolved_at || null,
      merchant: t.merchant || mockEngine.getMerchant(t.merchant_id),
      events: t.events || [],
    };
  } catch (err) {
    console.warn(`[getTicket] Live fetch failed, fallback to mock:`, err);
    return mockEngine.getTicket(id) || null;
  }
}

export async function listApprovals(): Promise<Approval[]> {
  if (IS_MOCK) {
    return mockEngine.listApprovals();
  }
  try {
    const res = await fetch(`${API_BASE_URL}/approvals`, {
      headers: getAuthHeaders(),
    });
    checkAuthError(res.status);
    if (res.status === 403) throw new Error('Agent access required (403)');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`[listApprovals] Live fetch failed, fallback to mock:`, err);
    return mockEngine.listApprovals();
  }
}

export async function decideApproval(
  id: string,
  approve: boolean
): Promise<{ success: boolean }> {
  if (IS_MOCK) {
    return mockEngine.decideApproval(id, approve);
  }
  try {
    const action = approve ? 'approve' : 'reject';
    const res = await fetch(`${API_BASE_URL}/approvals/${id}/${action}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    checkAuthError(res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { success: true };
  } catch (err) {
    console.warn(`[decideApproval] Live call failed, fallback to mock:`, err);
    return mockEngine.decideApproval(id, approve);
  }
}

export async function listEscalations(): Promise<CaseFile[]> {
  if (IS_MOCK) {
    return mockEngine.listEscalations();
  }
  try {
    const res = await fetch(`${API_BASE_URL}/escalations`, {
      headers: getAuthHeaders(),
    });
    checkAuthError(res.status);
    if (res.status === 403) throw new Error('Agent access required (403)');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`[listEscalations] Live fetch failed, fallback to mock:`, err);
    return mockEngine.listEscalations();
  }
}

export async function getMetrics(): Promise<Metrics> {
  if (IS_MOCK) {
    return mockEngine.getMetrics();
  }
  try {
    const res = await fetch(`${API_BASE_URL}/metrics`, {
      headers: getAuthHeaders(),
    });
    checkAuthError(res.status);
    if (res.status === 403) throw new Error('Agent access required (403)');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      tickets_by_tier: {
        T1: data.tickets_by_tier?.T1 ?? data.tickets_by_tier?.['1'] ?? 0,
        T2A: data.tickets_by_tier?.T2A ?? data.tickets_by_tier?.['2A'] ?? 0,
        T2B: data.tickets_by_tier?.T2B ?? data.tickets_by_tier?.['2B'] ?? data.tickets_by_tier?.['2'] ?? 0,
        T3: data.tickets_by_tier?.T3 ?? data.tickets_by_tier?.['3'] ?? 0,
      },
      avg_time_to_resolution_s: data.avg_time_to_resolution_s ?? 4.8,
      downtime_minutes_recovered: data.downtime_minutes_recovered ?? 1420,
      escalations: data.escalations ?? 0,
      policy_violations: data.policy_violations ?? 0,
      handoff_completeness: data.handoff_completeness ?? 100,
      eval: data.eval || undefined,
    };
  } catch (err) {
    console.warn(`[getMetrics] Live fetch failed, fallback to mock:`, err);
    return mockEngine.getMetrics();
  }
}

export async function simulateOutage(merchantId?: string): Promise<{ success: boolean; ticket?: TicketDetail }> {
  const mId = merchantId || 'm1';
  if (IS_MOCK) {
    return mockEngine.simulateOutage(mId);
  }
  try {
    const res = await fetch(`${API_BASE_URL}/simulate/outage`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ merchant_id: mId, device_id: `SB-${mId.toUpperCase()}` }),
    });
    checkAuthError(res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { success: true, ticket: data.ticket };
  } catch (err) {
    console.warn(`[simulateOutage] Live call failed, fallback to mock:`, err);
    return mockEngine.simulateOutage(mId);
  }
}

export async function resetDemo(): Promise<{ success: boolean }> {
  if (IS_MOCK) {
    mockEngine.reset();
    return { success: true };
  }
  try {
    const res = await fetch(`${API_BASE_URL}/admin/reset`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    checkAuthError(res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { success: true };
  } catch (err) {
    console.warn(`[resetDemo] Live call failed, fallback to mock:`, err);
    mockEngine.reset();
    return { success: true };
  }
}
