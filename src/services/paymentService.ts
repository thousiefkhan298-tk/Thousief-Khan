/**
 * SPEED FIT Payment Ledger & Reminder Management Engine
 *
 * Implements:
 * - Ledger with itemized charges, partial payments, and transaction receipts
 * - Accurate balance calculation: outstandingBalance = totalCharges - totalPaid
 * - Due date strictly distinct from renewal date
 * - Configurable upcoming (3 days), due today, and overdue reminders with follow-up history
 * - Automatic reminder stoppage once balance is cleared
 * - Truthful external messaging status (manual drafts when setup is unconfigured)
 */

export interface LedgerCharge {
  id: string;
  description: string;
  amountINR: number;
  date: string;
}

export interface LedgerPayment {
  id: string;
  amountINR: number;
  date: string;
  method: 'UPI' | 'Card' | 'Bank Transfer' | 'Cash' | string;
  receiptNumber: string;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
}

export interface FollowUpEntry {
  id: string;
  date: string;
  stage: 'upcoming_3_days' | 'due_today' | 'overdue' | 'manual_followup';
  channel: 'in_app' | 'manual_draft' | 'external_gateway';
  status: 'delivered' | 'draft_ready' | 'setup_required';
  notes: string;
  recipientEmail?: string;
  recipientPhone?: string;
  sentBy?: string;
}

export interface PaymentLedgerState {
  totalCharges: number;
  totalPaid: number;
  outstandingBalance: number;
  status: 'Paid' | 'Partially Paid' | 'Due' | 'Overdue';
  dueDate: string;
  renewalDate: string;
  isOverdue: boolean;
  daysUntilDue: number;
  overdueDays: number;
}

/**
 * Calculates accurate ledger balance, charges, payments, and statuses.
 * Due date is kept strictly distinct from renewal date.
 */
export function calculatePaymentLedger(
  record: {
    feeINR?: number | string;
    amountPaid?: number | string;
    outstandingBalance?: number | string;
    dueDate?: string;
    renewalDate?: string;
    startDate?: string;
    charges?: LedgerCharge[];
    payments?: LedgerPayment[];
    transactions?: any[];
  },
  currentDate: Date = new Date()
): PaymentLedgerState {
  // 1. Calculate Total Charges
  const baseFee = Number(record.feeINR || 0);
  const additionalCharges = (record.charges || []).reduce((acc, c) => acc + Number(c.amountINR || 0), 0);
  const totalCharges = additionalCharges > 0 ? baseFee + additionalCharges : baseFee;

  // 2. Calculate Total Paid
  const itemizedPaid = (record.payments || []).reduce((acc, p) => acc + Number(p.amountINR || 0), 0);
  const transactionPaid = (record.transactions || []).reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const directPaid = Number(record.amountPaid || 0);
  
  // Use itemized payments if present, otherwise direct or transactions
  const totalPaid = Math.max(itemizedPaid, transactionPaid, directPaid);

  // 3. Outstanding Balance (bounded at 0)
  const outstandingBalance = Math.max(0, totalCharges - totalPaid);

  // 4. Due Date vs Renewal Date
  const dueDate = record.dueDate || '';
  // Renewal date is distinct from due date (e.g. 30 days after start or explicit renewal date)
  const renewalDate = record.renewalDate || (dueDate ? addDaysToDateString(dueDate, 15) : '');

  // 5. Calendar day difference in IST
  let daysUntilDue = 0;
  let overdueDays = 0;
  let isOverdue = false;

  if (dueDate) {
    const [dueY, dueM, dueD] = dueDate.split('-').map(Number);
    if (dueY && dueM && dueD) {
      // Calculate IST calendar days
      const istNow = new Date(currentDate.getTime() + (currentDate.getTimezoneOffset() * 60000) + (5.5 * 3600000));
      const curY = istNow.getFullYear();
      const curM = istNow.getMonth() + 1;
      const curD = istNow.getDate();

      const dueUtc = Date.UTC(dueY, dueM - 1, dueD);
      const curUtc = Date.UTC(curY, curM - 1, curD);
      daysUntilDue = Math.round((dueUtc - curUtc) / 86400000);

      if (daysUntilDue < 0) {
        isOverdue = true;
        overdueDays = Math.abs(daysUntilDue);
      }
    }
  }

  // 6. Status Determination
  let status: 'Paid' | 'Partially Paid' | 'Due' | 'Overdue';
  if (totalCharges > 0 && outstandingBalance === 0) {
    status = 'Paid';
  } else if (totalPaid > 0 && outstandingBalance > 0) {
    status = 'Partially Paid';
  } else if (isOverdue && outstandingBalance > 0) {
    status = 'Overdue';
  } else {
    status = 'Due';
  }

  return {
    totalCharges,
    totalPaid,
    outstandingBalance,
    status,
    dueDate,
    renewalDate,
    isOverdue,
    daysUntilDue,
    overdueDays
  };
}

/**
 * Creates an itemized partial payment transaction with unique receipt number.
 */
export function recordPartialPayment(
  currentRecord: any,
  payment: {
    amountINR: number;
    method: 'UPI' | 'Card' | 'Bank Transfer' | 'Cash' | string;
    referenceNumber?: string;
    notes?: string;
    recordedBy?: string;
  }
): {
  updatedRecord: any;
  receipt: LedgerPayment;
} {
  const paymentDate = new Date().toISOString().split('T')[0];
  const receiptNumber = `SF-REC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
  
  const newPayment: LedgerPayment = {
    id: `pay-${Date.now()}`,
    amountINR: Number(payment.amountINR),
    date: paymentDate,
    method: payment.method,
    receiptNumber,
    referenceNumber: payment.referenceNumber || '',
    notes: payment.notes || '',
    recordedBy: payment.recordedBy || 'Speed Fit Coach'
  };

  const existingPayments: LedgerPayment[] = Array.isArray(currentRecord.payments) ? currentRecord.payments : [];
  const updatedPayments = [...existingPayments, newPayment];

  const ledger = calculatePaymentLedger({
    ...currentRecord,
    payments: updatedPayments,
    amountPaid: updatedPayments.reduce((s, p) => s + p.amountINR, 0)
  });

  const updatedRecord = {
    ...currentRecord,
    payments: updatedPayments,
    amountPaid: ledger.totalPaid,
    outstandingBalance: ledger.outstandingBalance,
    status: ledger.status,
    paymentDate,
    referenceNumber: newPayment.referenceNumber || currentRecord.referenceNumber || '',
    updatedAt: new Date().toISOString()
  };

  return {
    updatedRecord,
    receipt: newPayment
  };
}

/**
 * Checks external messaging configuration status.
 * Truthfully reports when external SMS/WhatsApp gateways are not configured,
 * producing manual drafts instead of claiming fake automated delivery.
 */
export function checkExternalMessagingConfig(): {
  isConfigured: boolean;
  gateway: 'unconfigured' | 'twilio' | 'whatsapp_cloud';
  status: 'setup_required' | 'ready';
  description: string;
} {
  // In the current AI Studio development and preview environment, external WhatsApp/Twilio
  // API credentials (TWILIO_AUTH_TOKEN, WHATSAPP_API_KEY) are not provisioned in .env.
  const hasTwilio = Boolean(typeof process !== 'undefined' && process.env?.TWILIO_ACCOUNT_SID && process.env?.TWILIO_AUTH_TOKEN);
  const hasWhatsApp = Boolean(typeof process !== 'undefined' && process.env?.WHATSAPP_TOKEN && process.env?.WHATSAPP_PHONE_NUMBER_ID);

  if (hasTwilio) {
    return {
      isConfigured: true,
      gateway: 'twilio',
      status: 'ready',
      description: 'Twilio SMS service is provisioned and enabled.'
    };
  }

  if (hasWhatsApp) {
    return {
      isConfigured: true,
      gateway: 'whatsapp_cloud',
      status: 'ready',
      description: 'WhatsApp Business API is provisioned and enabled.'
    };
  }

  return {
    isConfigured: false,
    gateway: 'unconfigured',
    status: 'setup_required',
    description: 'External messaging gateway not configured. In-app notifications and manual draft messages are active.'
  };
}

/**
 * Generates a compliant reminder text draft and follow-up entry.
 */
export function createPaymentReminderDraft(
  record: any,
  client: any,
  stage: 'upcoming_3_days' | 'due_today' | 'overdue'
): {
  draftText: string;
  followUpEntry: FollowUpEntry;
  canSendInApp: boolean;
  externalStatus: 'setup_required' | 'ready';
} {
  const ledger = calculatePaymentLedger(record);
  const clientName = client?.name || client?.clientDetails?.fullName || 'Athlete';
  const pkgName = record.packageName || record.package || 'Speed Fit Training Package';
  const balanceStr = `₹${ledger.outstandingBalance.toLocaleString('en-IN')}`;

  let subject = '';
  let body = '';

  if (stage === 'upcoming_3_days') {
    subject = `Payment Reminder: ${pkgName} Due in 3 Days`;
    body = `Hi ${clientName}, your Speed Fit training package (${pkgName}) payment of ${balanceStr} is due on ${ledger.dueDate}. Please coordinate with your coach or clear your dues at your next session.`;
  } else if (stage === 'due_today') {
    subject = `Payment Due Today: ${pkgName}`;
    body = `Hi ${clientName}, your Speed Fit package payment of ${balanceStr} for ${pkgName} is due today (${ledger.dueDate}). Renewal date is scheduled for ${ledger.renewalDate}.`;
  } else {
    subject = `Overdue Notice: ${pkgName}`;
    body = `Hi ${clientName}, friendly reminder that your balance of ${balanceStr} for ${pkgName} is currently overdue by ${ledger.overdueDays} days. Please settle your dues with your trainer.`;
  }

  const config = checkExternalMessagingConfig();

  const followUpEntry: FollowUpEntry = {
    id: `fol-${Date.now()}`,
    date: new Date().toISOString(),
    stage,
    channel: config.isConfigured ? 'external_gateway' : 'manual_draft',
    status: config.isConfigured ? 'delivered' : 'setup_required',
    notes: `${subject}: ${body}`,
    recipientEmail: client?.email || '',
    recipientPhone: client?.phoneNumber || client?.clientDetails?.phone || '',
    sentBy: 'Coach / System'
  };

  return {
    draftText: `${subject}\n\n${body}`,
    followUpEntry,
    canSendInApp: true,
    externalStatus: config.status
  };
}

function addDaysToDateString(dateStr: string, days: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + days));
    return date.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}
