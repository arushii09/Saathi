import { Merchant, TicketDetail, Approval, CaseFile, Metrics } from '../types';

export const MOCK_MERCHANTS: Record<string, Merchant> = {
  m1: {
    id: 'm1',
    name: 'Ramesh Kirana Store',
    city: 'Ahmedabad',
    phone: '9876543210',
    soundbox_id: 'SB-JF3A31',
    device_status: 'offline',
    last_heartbeat: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
  },
  m2: {
    id: 'm2',
    name: 'Meena Tea Stall',
    city: 'Jaipur',
    phone: '9876543211',
    soundbox_id: 'SB-882K19',
    device_status: 'online',
    last_heartbeat: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  m3: {
    id: 'm3',
    name: 'Sharma Sweets',
    city: 'Lucknow',
    phone: '9876543212',
    soundbox_id: 'SB-HW9921',
    device_status: 'offline',
    last_heartbeat: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
  m4: {
    id: 'm4',
    name: 'Iqbal General Store',
    city: 'Delhi',
    phone: '9876543213',
    soundbox_id: 'SB-DL4402',
    device_status: 'online',
    last_heartbeat: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  m5: {
    id: 'm5',
    name: 'Patel Mobile Point',
    city: 'Surat',
    phone: '9876543214',
    soundbox_id: 'SB-SR7710',
    device_status: 'offline',
    last_heartbeat: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
  },
};

export const MOCK_TICKETS: TicketDetail[] = [
  {
    id: 't-m1-001',
    merchant_id: 'm1',
    status: 'awaiting_merchant',
    tier: 'T2A',
    source: 'merchant',
    language: 'hi',
    summary: 'Soundbox silent since yesterday (offline 18h)',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    merchant: MOCK_MERCHANTS.m1,
    events: [
      {
        step_no: 1,
        type: 'transcript',
        ts: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        payload: {
          text: 'Mera Soundbox kal se nahi bol raha',
          language: 'hi',
          confidence: 0.93,
        },
      },
      {
        step_no: 2,
        type: 'intent',
        ts: new Date(Date.now() - 15 * 60 * 1000 + 400).toISOString(),
        payload: {
          intents: ['device_offline', 'sound_silent'],
        },
      },
      {
        step_no: 3,
        type: 'tool_proposed',
        ts: new Date(Date.now() - 15 * 60 * 1000 + 800).toISOString(),
        payload: {
          tool: 'get_device_health',
          args: { merchant_id: 'm1', soundbox_id: 'SB-JF3A31' },
        },
      },
      {
        step_no: 4,
        type: 'policy_decision',
        ts: new Date(Date.now() - 15 * 60 * 1000 + 1100).toISOString(),
        payload: {
          decision: 'ALLOW',
          tier: 'T1',
          rule: 'read_only_lookup',
          reason: 'Read-only device checks are always allowed without side-effects.',
        },
      },
      {
        step_no: 5,
        type: 'tool_result',
        ts: new Date(Date.now() - 15 * 60 * 1000 + 1700).toISOString(),
        payload: {
          status: 'offline',
          hours_since_heartbeat: 18,
          battery_level: 82,
          signal_rssi: -84,
        },
      },
      {
        step_no: 6,
        type: 'policy_decision',
        ts: new Date(Date.now() - 15 * 60 * 1000 + 2200).toISOString(),
        payload: {
          decision: 'NEEDS_MERCHANT_CONFIRM',
          tier: 'T2A',
          rule: 'restart_requires_merchant_yes',
          reason: 'Remote restart alters device operation; merchant confirmation required.',
        },
      },
      {
        step_no: 7,
        type: 'reply',
        ts: new Date(Date.now() - 15 * 60 * 1000 + 2800).toISOString(),
        payload: {
          text: 'आपका Soundbox 18 घंटे से बंद है। क्या मैं इसे अभी रीस्टार्ट कर दूँ?',
          audio_url: null,
          requires_confirmation: true,
        },
      },
    ],
  },
  {
    id: 't-m2-002',
    merchant_id: 'm2',
    status: 'resolved',
    tier: 'T1',
    source: 'merchant',
    language: 'hi',
    summary: 'Settlement delayed query resolved with bank processing window info',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 44 * 60 * 1000).toISOString(),
    merchant: MOCK_MERCHANTS.m2,
    events: [
      {
        step_no: 1,
        type: 'transcript',
        ts: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        payload: {
          text: 'Kal ka paisa abhi tak bank khate me nahi aaya',
          language: 'hi',
          confidence: 0.95,
        },
      },
      {
        step_no: 2,
        type: 'intent',
        ts: new Date(Date.now() - 45 * 60 * 1000 + 500).toISOString(),
        payload: {
          intents: ['settlement_inquiry', 'payout_status'],
        },
      },
      {
        step_no: 3,
        type: 'tool_proposed',
        ts: new Date(Date.now() - 45 * 60 * 1000 + 900).toISOString(),
        payload: {
          tool: 'get_settlement_status',
          args: { merchant_id: 'm2' },
        },
      },
      {
        step_no: 4,
        type: 'policy_decision',
        ts: new Date(Date.now() - 45 * 60 * 1000 + 1200).toISOString(),
        payload: {
          decision: 'ALLOW',
          tier: 'T1',
          rule: 'read_only_lookup',
          reason: 'Settlement status read is informational only.',
        },
      },
      {
        step_no: 5,
        type: 'tool_result',
        ts: new Date(Date.now() - 45 * 60 * 1000 + 1800).toISOString(),
        payload: {
          settlement_id: 'SET-99128',
          amount: 4850,
          status: 'processing',
          expected_by: 'Today, 2:00 PM',
          utr: 'UTR-PENDING',
        },
      },
      {
        step_no: 6,
        type: 'reply',
        ts: new Date(Date.now() - 45 * 60 * 1000 + 2400).toISOString(),
        payload: {
          text: 'कल का ₹4,850 का सेटलमेंट बैंक प्रोसेस में है और आज दोपहर 2:00 बजे तक आपके खाते में आ जाएगा।',
        },
      },
    ],
  },
];

export const MOCK_APPROVALS: Approval[] = [
  {
    id: 'appr-001',
    ticket_id: 't-m3-003',
    tool: 'create_technician_ticket',
    reason: 'Restart failed to recover connectivity; suspect hardware SIM module failure',
    recommended_action: 'Dispatch field engineer for Soundbox replacement within 24h',
    created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    merchant: MOCK_MERCHANTS.m3,
  },
];

export const MOCK_ESCALATIONS: CaseFile[] = [
  {
    merchant: MOCK_MERCHANTS.m4,
    transcript: 'Mere Soundbox par bina kisi customer ke ₹2,450 ka payment alert aaya aur account se cut gaya',
    language: 'hi',
    stt_confidence: 0.94,
    diagnosis: 'Possible unauthorised transaction / fraud report flagged by merchant',
    evidence: [
      'Transaction ID: TXN-890214 flagged by merchant at 10:14 AM',
      'Amount: ₹2,450.00',
      'No corresponding QR scan detected in merchant counter geo-fence',
    ],
    actions_taken: [
      'Blocked further auto-actions per Safety Tier 3 policy',
      'Logged dispute case file in security audit ledger',
    ],
    recommended_next_step: 'Human fraud team review of transaction dispute and merchant account freeze if needed',
    escalation_reason: 'Tier 3: Unauthorised transactions, fraud disputes, and money movement require human investigation',
    told_to_merchant: 'हमारी विशेषज्ञ सुरक्षा टीम आपके मामले की समीक्षा कर रही है और 15 मिनट में आपसे संपर्क करेगी।',
  },
];

export const MOCK_METRICS: Metrics = {
  tickets_by_tier: {
    T1: 342,
    T2A: 188,
    T2B: 47,
    T3: 19,
  },
  avg_time_to_resolution_s: 4.8,
  downtime_minutes_recovered: 1420,
  escalations: 19,
  policy_violations: 0,
  handoff_completeness: 100,
  eval: {
    hi_intent_accuracy: 94.2,
    en_intent_accuracy: 96.5,
    hinglish_intent_accuracy: 92.8,
    tier_classification_accuracy: 99.4,
    median_latency_seconds: 3.2,
    safety_violations_count: 0,
    sample_size_n: 500,
  },
};
