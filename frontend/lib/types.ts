export type Tier = 'T1' | 'T2A' | 'T2B' | 'T3';

export type Decision = 'ALLOW' | 'NEEDS_MERCHANT_CONFIRM' | 'NEEDS_HUMAN_APPROVAL' | 'ESCALATE';

export type TicketStatus =
  | 'open'
  | 'awaiting_merchant'
  | 'awaiting_human'
  | 'resolved'
  | 'escalated'
  | 'failed';

export interface Merchant {
  id: string;
  name: string;
  city: string;
  phone?: string;
  soundbox_id: string;
  device_status: 'online' | 'offline';
  last_heartbeat?: string;
}

export type UserRole = 'merchant' | 'agent';

export interface AuthSession {
  token: string;
  role: UserRole;
  merchant?: Merchant;
  agent?: {
    id: string;
    name: string;
    role: string;
    badge?: string;
  };
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  merchant?: Merchant;
  user?: {
    id: string;
    name: string;
    role: string;
    badge?: string;
  };
}

export interface AgentResponse {
  ticket_id: string;
  transcript: string | null;
  language: string;
  stt_confidence: number | null;
  reply_text: string;
  reply_audio_url: string | null;
  tier: Tier | null;
  status: TicketStatus;
  requires_confirmation: boolean;
  evidence?: string[];
}

export type TraceType =
  | 'transcript'
  | 'intent'
  | 'tool_proposed'
  | 'policy_decision'
  | 'tool_result'
  | 'merchant_confirmation'
  | 'approval_created'
  | 'approval_decided'
  | 'escalation'
  | 'reply'
  | 'error';

export interface TraceEvent {
  step_no: number;
  type: TraceType;
  ts: string;
  payload: Record<string, unknown>;
}

export interface Ticket {
  id: string;
  merchant_id: string;
  status: TicketStatus;
  tier: Tier | null;
  source: 'merchant' | 'proactive';
  language: string;
  summary: string;
  created_at: string;
  resolved_at?: string | null;
}

export interface TicketDetail extends Ticket {
  merchant: Merchant;
  events: TraceEvent[];
}

export interface Approval {
  id: string;
  ticket_id: string;
  tool: string;
  reason: string;
  recommended_action: string;
  created_at: string;
  merchant: Merchant;
}

export interface CaseFile {
  merchant: Merchant;
  transcript: string;
  language: string;
  stt_confidence: number | null;
  diagnosis: string;
  evidence: string[];
  actions_taken: string[];
  recommended_next_step: string;
  escalation_reason: string;
  told_to_merchant: string;
}

export interface Metrics {
  tickets_by_tier: Record<Tier, number>;
  avg_time_to_resolution_s: number;
  downtime_minutes_recovered: number;
  escalations: number;
  policy_violations: number;
  handoff_completeness: number;
  eval?: Record<string, number | string>;
}
