import {
  Merchant,
  TicketDetail,
  Approval,
  CaseFile,
  Metrics,
  AgentResponse,
  TraceEvent,
} from '../types';
import {
  MOCK_MERCHANTS,
  MOCK_TICKETS,
  MOCK_APPROVALS,
  MOCK_ESCALATIONS,
  MOCK_METRICS,
} from './fixtures';

class MockEngine {
  private merchants: Record<string, Merchant> = {};
  private tickets: TicketDetail[] = [];
  private approvals: Approval[] = [];
  private escalations: CaseFile[] = [];
  private metrics: Metrics = { ...MOCK_METRICS };

  constructor() {
    this.reset();
  }

  public reset() {
    this.merchants = JSON.parse(JSON.stringify(MOCK_MERCHANTS));
    this.tickets = JSON.parse(JSON.stringify(MOCK_TICKETS));
    this.approvals = JSON.parse(JSON.stringify(MOCK_APPROVALS));
    this.escalations = JSON.parse(JSON.stringify(MOCK_ESCALATIONS));
    this.metrics = JSON.parse(JSON.stringify(MOCK_METRICS));
  }

  public getMerchant(id: string): Merchant {
    return this.merchants[id] || {
      id,
      name: 'Merchant Store',
      city: 'India',
      soundbox_id: `SB-${id.toUpperCase()}`,
      device_status: 'online',
    };
  }

  public getMerchantByPhone(phone: string): Merchant | undefined {
    return Object.values(this.merchants).find((m) => m.phone === phone);
  }

  public loginMerchant(phone: string, otp: string): { access_token: string; role: 'merchant'; merchant: Merchant } {
    if (otp !== '123456') {
      throw new Error('Invalid OTP. Use demo OTP 123456.');
    }
    const merchant = this.getMerchantByPhone(phone);
    if (!merchant) {
      throw new Error(`Merchant with phone ${phone} not found. Use a seeded demo phone.`);
    }
    const token = `mock-token-merchant-${merchant.id}-${Date.now()}`;
    return {
      access_token: token,
      role: 'merchant',
      merchant: { ...merchant },
    };
  }

  public loginAgent(otp: string): { access_token: string; role: 'agent'; user: { id: string; name: string; role: string; badge: string } } {
    if (otp !== '123456') {
      throw new Error('Invalid OTP. Use demo OTP 123456.');
    }
    const token = `mock-token-agent-1-${Date.now()}`;
    return {
      access_token: token,
      role: 'agent',
      user: {
        id: 'agent_1',
        name: 'Pooja Sharma',
        role: 'agent',
        badge: 'Tier 2 Support Specialist',
      },
    };
  }

  public listMyTickets(merchantId: string): TicketDetail[] {
    return this.tickets
      .filter((t) => t.merchant_id === merchantId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getMyTicket(ticketId: string, merchantId: string): TicketDetail {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.merchant_id !== merchantId) {
      const err = new Error('Ticket not found.');
      (err as any).status = 404;
      throw err;
    }
    return ticket;
  }

  public listTickets(params?: { status?: string; merchant_id?: string }): TicketDetail[] {
    let list = [...this.tickets];
    if (params?.status) {
      list = list.filter((t) => t.status === params.status);
    }
    if (params?.merchant_id) {
      list = list.filter((t) => t.merchant_id === params.merchant_id);
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getTicket(id: string): TicketDetail | undefined {
    return this.tickets.find((t) => t.id === id);
  }

  public listApprovals(): Approval[] {
    return [...this.approvals];
  }

  public decideApproval(id: string, approve: boolean): { success: boolean; approval?: Approval } {
    const idx = this.approvals.findIndex((a) => a.id === id);
    if (idx === -1) return { success: false };
    const approval = this.approvals[idx];
    this.approvals.splice(idx, 1);

    // update associated ticket trace
    const ticket = this.tickets.find((t) => t.id === approval.ticket_id);
    if (ticket) {
      const nextStepNo = (ticket.events?.length || 0) + 1;
      ticket.events.push({
        step_no: nextStepNo,
        type: 'approval_decided',
        ts: new Date().toISOString(),
        payload: {
          decision: approve ? 'APPROVED' : 'REJECTED',
          by: 'Support Agent',
          action: approval.recommended_action,
        },
      });
      ticket.status = approve ? 'resolved' : 'escalated';
      ticket.resolved_at = new Date().toISOString();
    }
    return { success: true, approval };
  }

  public listEscalations(): CaseFile[] {
    return [...this.escalations];
  }

  public getMetrics(): Metrics {
    return { ...this.metrics };
  }

  public simulateOutage(merchantId: string): { success: boolean; ticket: TicketDetail } {
    const merchant = this.getMerchant(merchantId);
    merchant.device_status = 'offline';
    merchant.last_heartbeat = new Date(Date.now() - 3600 * 1000).toISOString();

    const ticketId = `t-outage-${Date.now()}`;
    const newTicket: TicketDetail = {
      id: ticketId,
      merchant_id: merchant.id,
      status: 'awaiting_merchant',
      tier: 'T2A',
      source: 'proactive',
      language: 'hi',
      summary: `Proactive outage detected: Soundbox offline (heartbeat missed)`,
      created_at: new Date().toISOString(),
      merchant: { ...merchant },
      events: [
        {
          step_no: 1,
          type: 'intent',
          ts: new Date().toISOString(),
          payload: {
            intents: ['proactive_health_monitor', 'heartbeat_timeout'],
            source: 'heartbeat_cron_monitor',
          },
        },
        {
          step_no: 2,
          type: 'tool_proposed',
          ts: new Date(Date.now() + 200).toISOString(),
          payload: {
            tool: 'get_device_health',
            args: { soundbox_id: merchant.soundbox_id },
          },
        },
        {
          step_no: 3,
          type: 'policy_decision',
          ts: new Date(Date.now() + 400).toISOString(),
          payload: {
            decision: 'ALLOW',
            tier: 'T1',
            rule: 'read_only_lookup',
            reason: 'System health check is safe read-only query.',
          },
        },
        {
          step_no: 4,
          type: 'tool_result',
          ts: new Date(Date.now() + 700).toISOString(),
          payload: {
            soundbox_id: merchant.soundbox_id,
            status: 'offline',
            hours_since_heartbeat: 1,
          },
        },
        {
          step_no: 5,
          type: 'policy_decision',
          ts: new Date(Date.now() + 900).toISOString(),
          payload: {
            decision: 'NEEDS_MERCHANT_CONFIRM',
            tier: 'T2A',
            rule: 'restart_requires_merchant_yes',
            reason: 'Device recovery restart requires merchant permission.',
          },
        },
        {
          step_no: 6,
          type: 'reply',
          ts: new Date(Date.now() + 1100).toISOString(),
          payload: {
            text: 'सिमुलेटेड अलर्ट: आपका Soundbox नेटवर्क से कट गया है। क्या मैं इसे रीस्टार्ट करूँ?',
            requires_confirmation: true,
          },
        },
      ],
    };

    this.tickets.unshift(newTicket);
    return { success: true, ticket: newTicket };
  }

  public confirmTicket(ticketId: string, answer: 'yes' | 'no'): AgentResponse {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const merchant = this.getMerchant(ticket.merchant_id);
    const step = (ticket.events?.length || 0) + 1;

    ticket.events.push({
      step_no: step,
      type: 'merchant_confirmation',
      ts: new Date().toISOString(),
      payload: { answer, channel: 'voice_or_tap' },
    });

    if (answer === 'yes') {
      ticket.events.push({
        step_no: step + 1,
        type: 'tool_proposed',
        ts: new Date(Date.now() + 300).toISOString(),
        payload: {
          tool: 'restart_device',
          args: { soundbox_id: merchant.soundbox_id },
        },
      });

      merchant.device_status = 'online';
      merchant.last_heartbeat = new Date().toISOString();

      ticket.events.push({
        step_no: step + 2,
        type: 'tool_result',
        ts: new Date(Date.now() + 800).toISOString(),
        payload: {
          restart: 'success',
          device_status: 'online',
          latency_ms: 640,
        },
      });

      const replyText =
        ticket.language === 'en'
          ? 'Your Soundbox is now restarted and online.'
          : 'आपका Soundbox रीस्टार्ट हो गया है और अब चालू है।';

      ticket.events.push({
        step_no: step + 3,
        type: 'reply',
        ts: new Date(Date.now() + 1100).toISOString(),
        payload: { text: replyText },
      });

      ticket.status = 'resolved';
      ticket.resolved_at = new Date().toISOString();
      this.metrics.downtime_minutes_recovered += 45;

      return {
        ticket_id: ticket.id,
        transcript: answer,
        language: ticket.language,
        stt_confidence: 0.98,
        reply_text: replyText,
        reply_audio_url: null,
        tier: 'T2A',
        status: 'resolved',
        requires_confirmation: false,
        evidence: ['Device: online', 'Restart: successful'],
      };
    } else {
      const replyText =
        ticket.language === 'en'
          ? 'No changes made. Your Soundbox was not restarted.'
          : 'ठीक है, Soundbox रीस्टार्ट नहीं किया गया।';

      ticket.events.push({
        step_no: step + 1,
        type: 'reply',
        ts: new Date().toISOString(),
        payload: { text: replyText },
      });
      ticket.status = 'resolved';
      ticket.resolved_at = new Date().toISOString();

      return {
        ticket_id: ticket.id,
        transcript: answer,
        language: ticket.language,
        stt_confidence: 0.98,
        reply_text: replyText,
        reply_audio_url: null,
        tier: 'T2A',
        status: 'resolved',
        requires_confirmation: false,
      };
    }
  }

  public processMessage(
    merchantId: string,
    text: string,
    languageHint: string = 'hi'
  ): AgentResponse {
    const merchant = this.getMerchant(merchantId);
    const ticketId = `t-${merchantId}-${Date.now()}`;
    const lang = languageHint || 'hi';

    // Tailored scenarios by merchant
    if (merchantId === 'm1') {
      // m1: Soundbox silent -> inspect device (offline 18h), asks to restart (T2A)
      const ticket: TicketDetail = {
        id: ticketId,
        merchant_id: merchant.id,
        status: 'awaiting_merchant',
        tier: 'T2A',
        source: 'merchant',
        language: lang,
        summary: 'Soundbox silent complaint, offline 18h detected',
        created_at: new Date().toISOString(),
        merchant: { ...merchant },
        events: [
          {
            step_no: 1,
            type: 'transcript',
            ts: new Date().toISOString(),
            payload: { text, language: lang, confidence: 0.93 },
          },
          {
            step_no: 2,
            type: 'intent',
            ts: new Date(Date.now() + 200).toISOString(),
            payload: { intents: ['device_offline', 'sound_silent'] },
          },
          {
            step_no: 3,
            type: 'tool_proposed',
            ts: new Date(Date.now() + 450).toISOString(),
            payload: { tool: 'get_device_health', args: { merchant_id: merchant.id } },
          },
          {
            step_no: 4,
            type: 'policy_decision',
            ts: new Date(Date.now() + 700).toISOString(),
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
            ts: new Date(Date.now() + 950).toISOString(),
            payload: { status: 'offline', hours_since_heartbeat: 18 },
          },
          {
            step_no: 6,
            type: 'policy_decision',
            ts: new Date(Date.now() + 1200).toISOString(),
            payload: {
              decision: 'NEEDS_MERCHANT_CONFIRM',
              tier: 'T2A',
              rule: 'restart_requires_merchant_yes',
              reason: 'Restart changes device state, so the merchant must confirm.',
            },
          },
          {
            step_no: 7,
            type: 'reply',
            ts: new Date(Date.now() + 1500).toISOString(),
            payload: {
              text:
                lang === 'en'
                  ? 'Your Soundbox has been offline for 18 hours. Shall I restart it now?'
                  : 'आपका Soundbox 18 घंटे से बंद है। क्या मैं इसे रीस्टार्ट कर दूँ?',
            },
          },
        ],
      };
      this.tickets.unshift(ticket);
      return {
        ticket_id: ticketId,
        transcript: text,
        language: lang,
        stt_confidence: 0.93,
        reply_text:
          lang === 'en'
            ? 'Your Soundbox has been offline for 18 hours. Shall I restart it now?'
            : 'आपका Soundbox 18 घंटे से बंद है। क्या मैं इसे रीस्टार्ट कर दूँ?',
        reply_audio_url: null,
        tier: 'T2A',
        status: 'awaiting_merchant',
        requires_confirmation: true,
        evidence: ['Device: offline 18h', 'Signal: weak'],
      };
    } else if (merchantId === 'm2') {
      // m2: Settlement delayed query -> explains settlement (T1)
      const ticket: TicketDetail = {
        id: ticketId,
        merchant_id: merchant.id,
        status: 'resolved',
        tier: 'T1',
        source: 'merchant',
        language: lang,
        summary: 'Settlement inquiry, processing window confirmed',
        created_at: new Date().toISOString(),
        resolved_at: new Date(Date.now() + 2000).toISOString(),
        merchant: { ...merchant },
        events: [
          {
            step_no: 1,
            type: 'transcript',
            ts: new Date().toISOString(),
            payload: { text, language: lang, confidence: 0.96 },
          },
          {
            step_no: 2,
            type: 'intent',
            ts: new Date(Date.now() + 200).toISOString(),
            payload: { intents: ['settlement_status'] },
          },
          {
            step_no: 3,
            type: 'tool_proposed',
            ts: new Date(Date.now() + 500).toISOString(),
            payload: { tool: 'get_settlement_status', args: { merchant_id: merchant.id } },
          },
          {
            step_no: 4,
            type: 'policy_decision',
            ts: new Date(Date.now() + 750).toISOString(),
            payload: {
              decision: 'ALLOW',
              tier: 'T1',
              rule: 'read_only_lookup',
              reason: 'Settlement read-only queries are informational.',
            },
          },
          {
            step_no: 5,
            type: 'tool_result',
            ts: new Date(Date.now() + 1000).toISOString(),
            payload: { amount: 3200, status: 'processing', expected_by: 'Today, 2:00 PM' },
          },
          {
            step_no: 6,
            type: 'reply',
            ts: new Date(Date.now() + 1300).toISOString(),
            payload: {
              text:
                lang === 'en'
                  ? 'Your yesterday settlement of ₹3,200 is being processed by the bank and will arrive by 2:00 PM today.'
                  : 'कल का ₹3,200 का सेटलमेंट बैंक प्रोसेस में है और आज दोपहर 2:00 बजे तक आपके खाते में आ जाएगा।',
            },
          },
        ],
      };
      this.tickets.unshift(ticket);
      return {
        ticket_id: ticketId,
        transcript: text,
        language: lang,
        stt_confidence: 0.96,
        reply_text:
          lang === 'en'
            ? 'Your yesterday settlement of ₹3,200 is being processed by the bank and will arrive by 2:00 PM today.'
            : 'कल का ₹3,200 का सेटलमेंट बैंक प्रोसेस में है और आज दोपहर 2:00 बजे तक आपके खाते में आ जाएगा।',
        reply_audio_url: null,
        tier: 'T1',
        status: 'resolved',
        requires_confirmation: false,
        evidence: ['Settlement: processing', 'Expected: 2:00 PM'],
      };
    } else if (merchantId === 'm3') {
      // m3: Restart fails -> technician ticket proposed, awaiting human (T2B)
      const ticket: TicketDetail = {
        id: ticketId,
        merchant_id: merchant.id,
        status: 'awaiting_human',
        tier: 'T2B',
        source: 'merchant',
        language: lang,
        summary: 'Hardware fault suspected, technician dispatch requested',
        created_at: new Date().toISOString(),
        merchant: { ...merchant },
        events: [
          {
            step_no: 1,
            type: 'transcript',
            ts: new Date().toISOString(),
            payload: { text, language: lang, confidence: 0.91 },
          },
          {
            step_no: 2,
            type: 'intent',
            ts: new Date(Date.now() + 200).toISOString(),
            payload: { intents: ['device_offline', 'hardware_fault'] },
          },
          {
            step_no: 3,
            type: 'tool_proposed',
            ts: new Date(Date.now() + 450).toISOString(),
            payload: { tool: 'get_device_health', args: { merchant_id: merchant.id } },
          },
          {
            step_no: 4,
            type: 'tool_result',
            ts: new Date(Date.now() + 800).toISOString(),
            payload: { status: 'offline', error_code: 'MODEM_FAULT_E04' },
          },
          {
            step_no: 5,
            type: 'tool_proposed',
            ts: new Date(Date.now() + 1100).toISOString(),
            payload: {
              tool: 'create_technician_ticket',
              args: { diagnosis: 'Hardware SIM modem failure' },
            },
          },
          {
            step_no: 6,
            type: 'policy_decision',
            ts: new Date(Date.now() + 1400).toISOString(),
            payload: {
              decision: 'NEEDS_HUMAN_APPROVAL',
              tier: 'T2B',
              rule: 'technician_dispatch_requires_human_approval',
              reason: 'Dispatching field technician incurs company cost; human approval required.',
            },
          },
          {
            step_no: 7,
            type: 'approval_created',
            ts: new Date(Date.now() + 1600).toISOString(),
            payload: {
              approval_id: `appr-${Date.now()}`,
              queue: 'field_operations',
            },
          },
          {
            step_no: 8,
            type: 'reply',
            ts: new Date(Date.now() + 1900).toISOString(),
            payload: {
              text:
                lang === 'en'
                  ? 'Your Soundbox appears to have a hardware issue. I have requested a technician visit, which is awaiting support manager approval.'
                  : 'आपके Soundbox में हार्डवेयर समस्या लग रही है। मैंने तकनीशियन विज़िट का अनुरोध किया है, जो सपोर्ट टीम की मंज़ूरी की प्रतीक्षा में है।',
            },
          },
        ],
      };

      const approval: Approval = {
        id: `appr-${Date.now()}`,
        ticket_id: ticketId,
        tool: 'create_technician_ticket',
        reason: 'Hardware fault code E04 (modem failure); remote restart failed',
        recommended_action: 'Dispatch field engineer with replacement Soundbox',
        created_at: new Date().toISOString(),
        merchant: { ...merchant },
      };

      this.tickets.unshift(ticket);
      this.approvals.unshift(approval);

      return {
        ticket_id: ticketId,
        transcript: text,
        language: lang,
        stt_confidence: 0.91,
        reply_text:
          lang === 'en'
            ? 'Your Soundbox appears to have a hardware issue. I have requested a technician visit, which is awaiting support manager approval.'
            : 'आपके Soundbox में हार्डवेयर समस्या लग रही है। मैंने तकनीशियन विज़िट का अनुरोध किया है, जो सपोर्ट टीम की मंज़ूरी की प्रतीक्षा में है।',
        reply_audio_url: null,
        tier: 'T2B',
        status: 'awaiting_human',
        requires_confirmation: false,
        evidence: ['Error: MODEM_FAULT_E04', 'Technician visit: requested'],
      };
    } else if (merchantId === 'm4') {
      // m4: Unauthorised transaction / fraud -> Tier 3 escalation
      const ticket: TicketDetail = {
        id: ticketId,
        merchant_id: merchant.id,
        status: 'escalated',
        tier: 'T3',
        source: 'merchant',
        language: lang,
        summary: 'Suspected unauthorised transaction dispute escalated to fraud desk',
        created_at: new Date().toISOString(),
        merchant: { ...merchant },
        events: [
          {
            step_no: 1,
            type: 'transcript',
            ts: new Date().toISOString(),
            payload: { text, language: lang, confidence: 0.94 },
          },
          {
            step_no: 2,
            type: 'intent',
            ts: new Date(Date.now() + 200).toISOString(),
            payload: { intents: ['unauthorised_transaction', 'fraud_dispute'] },
          },
          {
            step_no: 3,
            type: 'policy_decision',
            ts: new Date(Date.now() + 500).toISOString(),
            payload: {
              decision: 'ESCALATE',
              tier: 'T3',
              rule: 'fraud_and_money_movement_human_only',
              reason: 'Money disputes, unauthorized transactions, and fraud must be handled by trained human agents only.',
            },
          },
          {
            step_no: 4,
            type: 'escalation',
            ts: new Date(Date.now() + 800).toISOString(),
            payload: {
              escalation_id: `esc-${Date.now()}`,
              queue: 'fraud_investigation',
              priority: 'P1',
            },
          },
          {
            step_no: 5,
            type: 'reply',
            ts: new Date(Date.now() + 1100).toISOString(),
            payload: {
              text:
                lang === 'en'
                  ? 'I have logged this unauthorized payment report. Our dedicated fraud desk has received your complete case file and will contact you directly within 15 minutes.'
                  : 'मैंने इस अनधिकृत भुगतान की रिपोर्ट दर्ज कर ली है। हमारी सुरक्षा टीम को आपकी पूरी फ़ाइल मिल गई है और वे 15 मिनट के भीतर आपसे संपर्क करेंगे।',
            },
          },
        ],
      };

      const caseFile: CaseFile = {
        merchant: { ...merchant },
        transcript: text,
        language: lang,
        stt_confidence: 0.94,
        diagnosis: 'Suspected unauthorised transaction / fraud report',
        evidence: [
          'Merchant verbally disputed last payment alert',
          'Soundbox ID: ' + merchant.soundbox_id,
          'Risk score: high (spontaneous voice dispute)',
        ],
        actions_taken: ['Blocked auto actions under Tier 3 rules', 'Compiled audit case file'],
        recommended_next_step: 'Human agent to call merchant immediately and verify merchant wallet ledger',
        escalation_reason: 'Tier 3: Fraud, disputed debit, and money movement',
        told_to_merchant:
          lang === 'en'
            ? 'Our dedicated fraud team will contact you within 15 minutes.'
            : 'हमारी सुरक्षा टीम 15 मिनट के भीतर आपसे संपर्क करेगी।',
      };

      this.tickets.unshift(ticket);
      this.escalations.unshift(caseFile);

      return {
        ticket_id: ticketId,
        transcript: text,
        language: lang,
        stt_confidence: 0.94,
        reply_text:
          lang === 'en'
            ? 'I have logged this unauthorized payment report. Our dedicated fraud desk has received your complete case file and will contact you directly within 15 minutes.'
            : 'मैंने इस अनधिकृत भुगतान की रिपोर्ट दर्ज कर ली है। हमारी सुरक्षा टीम को आपकी पूरी फ़ाइल मिल गई है और वे 15 मिनट के भीतर आपसे संपर्क करेंगे।',
        reply_audio_url: null,
        tier: 'T3',
        status: 'escalated',
        requires_confirmation: false,
        evidence: ['Safety Tier 3: Escalate to Fraud Desk', 'Case file: Generated'],
      };
    } else {
      // m5: Combines settlement inquiry and device offline
      const ticket: TicketDetail = {
        id: ticketId,
        merchant_id: merchant.id,
        status: 'awaiting_merchant',
        tier: 'T2A',
        source: 'merchant',
        language: lang,
        summary: 'Compound query: settlement status + device offline',
        created_at: new Date().toISOString(),
        merchant: { ...merchant },
        events: [
          {
            step_no: 1,
            type: 'transcript',
            ts: new Date().toISOString(),
            payload: { text, language: lang, confidence: 0.92 },
          },
          {
            step_no: 2,
            type: 'intent',
            ts: new Date(Date.now() + 200).toISOString(),
            payload: { intents: ['settlement_status', 'device_offline'] },
          },
          {
            step_no: 3,
            type: 'tool_proposed',
            ts: new Date(Date.now() + 450).toISOString(),
            payload: { tool: 'get_settlement_status', args: { merchant_id: merchant.id } },
          },
          {
            step_no: 4,
            type: 'tool_result',
            ts: new Date(Date.now() + 750).toISOString(),
            payload: { amount: 1540, status: 'processing', expected_by: 'Today, 3:00 PM' },
          },
          {
            step_no: 5,
            type: 'tool_proposed',
            ts: new Date(Date.now() + 1000).toISOString(),
            payload: { tool: 'get_device_health', args: { merchant_id: merchant.id } },
          },
          {
            step_no: 6,
            type: 'tool_result',
            ts: new Date(Date.now() + 1300).toISOString(),
            payload: { status: 'offline', hours_since_heartbeat: 22 },
          },
          {
            step_no: 7,
            type: 'policy_decision',
            ts: new Date(Date.now() + 1550).toISOString(),
            payload: {
              decision: 'NEEDS_MERCHANT_CONFIRM',
              tier: 'T2A',
              rule: 'restart_requires_merchant_yes',
              reason: 'Device restart requires confirmation.',
            },
          },
          {
            step_no: 8,
            type: 'reply',
            ts: new Date(Date.now() + 1800).toISOString(),
            payload: {
              text:
                lang === 'en'
                  ? 'Your ₹1,540 settlement is processing and expected by 3:00 PM. Also, your Soundbox is offline; shall I restart it now?'
                  : 'आपका ₹1,540 का सेटलमेंट प्रोसेस में है और दोपहर 3:00 बजे तक आ जाएगा। साथ ही आपका Soundbox बंद है, क्या मैं इसे अभी रीस्टार्ट करूँ?',
            },
          },
        ],
      };
      this.tickets.unshift(ticket);
      return {
        ticket_id: ticketId,
        transcript: text,
        language: lang,
        stt_confidence: 0.92,
        reply_text:
          lang === 'en'
            ? 'Your ₹1,540 settlement is processing and expected by 3:00 PM. Also, your Soundbox is offline; shall I restart it now?'
            : 'आपका ₹1,540 का सेटलमेंट प्रोसेस में है और दोपहर 3:00 बजे तक आ जाएगा। साथ ही आपका Soundbox बंद है, क्या मैं इसे अभी रीस्टार्ट करूँ?',
        reply_audio_url: null,
        tier: 'T2A',
        status: 'awaiting_merchant',
        requires_confirmation: true,
        evidence: ['Settlement: ₹1,540 processing', 'Device: offline 22h'],
      };
    }
  }
}

export const mockEngine = new MockEngine();
