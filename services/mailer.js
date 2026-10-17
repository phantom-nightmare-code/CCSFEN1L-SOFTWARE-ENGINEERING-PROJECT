const axios = require('axios');

// Brevo is replaced by the Google Apps Script API
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APPS_SCRIPT_TOKEN = process.env.APPS_SCRIPT_TOKEN;

/* ---------- helpers ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(input) {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : String(input).split(/[,;\s]+/);
  const seen = new Set();
  return arr
    .map(s => String(s).trim().toLowerCase())
    .filter(s => s && EMAIL_RE.test(s) && !seen.has(s) && seen.add(s))
    .slice(0, 5);
}

async function sendViaGmailApi({ to, subject, html, cc }) {
  const recipients = parseEmails(to);
  if (!recipients.length) throw new Error('No valid recipients');

  // The Google Apps Script handles one recipient per call.
  for (const recipient of recipients) {
    const payload = {
      token: APPS_SCRIPT_TOKEN,
      to: recipient,
      subject: subject,
      htmlBody: html,
      fromName: 'FitForge'
    };

    console.log('[mailer] POST → Google Apps Script for:', recipient);

    try {
      const res = await axios.post(APPS_SCRIPT_URL, payload);
      
      if (!res.data.success) {
        throw new Error(res.data.error || 'Unknown Gmail API error');
      }
      console.log('[mailer] ✅ Email sent to:', recipient);
    } catch (error) {
      console.error('[mailer] ❌ Gmail API error:', error.message);
      throw error;
    }
  }
  
  return { success: true };
}

/* ---------- WELCOME / VERIFICATION ---------- */

async function sendWelcomeVerificationEmail({ to, fullName, verifyUrl }) {
  const name = fullName || 'there';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 24px; background:#ffffff;">
      <h2 style="text-align: center; color: #2563eb; margin-top: 0;">Welcome to FitForge 💪</h2>
      <p style="color:#333;">Hi ${name},</p>
      <p style="color:#333;">Thanks for signing up! Please confirm your email address to activate your account.</p>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${verifyUrl}" style="display:inline-block; padding: 12px 24px; background:#2563eb; color:#fff; border-radius:6px; text-decoration:none; font-weight:600;">
          Verify my email
        </a>
      </p>
      <p style="font-size: 12px; color:#666;">This link expires in 24 hours.</p>
      <hr style="border:none; border-top:1px solid #eee; margin: 24px 0;" />
      <p style="font-size: 13px; color:#333;">Here's what you can do once you're in:</p>
      <ul style="font-size: 13px; color:#333; padding-left: 20px;">
        <li>Log workouts and beat your personal records</li>
        <li>Build custom routines</li>
        <li>Subscribe to a membership plan</li>
        <li>Rent gym equipment by the hour</li>
        <li>Get coaching feedback from your coach</li>
      </ul>
      <p style="font-size: 11px; color: #888; text-align: center; margin-bottom: 0; margin-top: 24px;">
        If the button doesn't work, paste this link in your browser:<br/>
        <span style="word-break: break-all;">${verifyUrl}</span>
      </p>
      <p style="font-size: 12px; color: #888; text-align: center; margin-top: 24px;">
        — The FitForge Team<br/><i>Your move, your progress.</i>
      </p>
    </div>
  `;
  return sendViaGmailApi({ to, subject: 'Verify your FitForge account 💪', html });
}

/* ---------- PAYMENT VERIFICATION ---------- */

async function sendPaymentVerificationEmail({
  to, additionalTo = [], qrDataUrl, reference,
  amount, method, purpose, itemName,
}) {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-payment/${reference}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 24px; background:#ffffff;">
      <h2 style="text-align: center; color: #2563eb; margin-top: 0;">FitForge Payment Verification</h2>
      <p style="color:#333;">Hi,</p>
      <p style="color:#333;">Your payment is pending confirmation. Scan the QR code below (or click the button) to view the payment details and confirm.</p>
      <div style="text-align: center; margin: 20px 0;">
        <img src="${qrDataUrl}" alt="Payment QR Code" style="width: 220px; height: 220px; border-radius: 8px;" />
      </div>
      <table style="width: 100%; font-size: 14px; color: #333; border-collapse: collapse;">
        <tr><td style="padding: 6px 0;"><strong>Reference:</strong></td><td style="text-align:right;">${reference}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Amount:</strong></td><td style="text-align:right;">PHP ${Number(amount).toFixed(2)}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Method:</strong></td><td style="text-align:right; text-transform: uppercase;">${method}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Purpose:</strong></td><td style="text-align:right; text-transform: capitalize;">${purpose}</td></tr>
        ${itemName ? `<tr><td style="padding: 6px 0;"><strong>Item:</strong></td><td style="text-align:right;">${itemName}</td></tr>` : ''}
      </table>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${verifyUrl}" style="display:inline-block; padding: 12px 24px; background:#2563eb; color:#fff; border-radius:6px; text-decoration:none; font-weight:600;">
          View &amp; Confirm Payment
        </a>
      </p>
      <p style="font-size: 11px; color: #888; text-align: center; margin-bottom: 0;">
        If the button doesn't work, paste this link in your browser:<br/>
        <span style="word-break: break-all;">${verifyUrl}</span>
      </p>
      <p style="font-size: 12px; color: #888; text-align: center; margin-top: 24px;">
        Thank you,<br/>The FitForge Team
      </p>
    </div>
  `;
  const allRecipients = [
    ...parseEmails(to),
    ...parseEmails(additionalTo),
  ];
  const uniqueRecipients = [...new Set(allRecipients)];
  return sendViaGmailApi({
    to: uniqueRecipients,
    subject: `FitForge — Verify your payment (${reference})`,
    html,
  });
}

async function sendPaymentResultEmail({ to, reference, amount, status, reason }) {
  const ok = status === 'verified';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 24px; background:#ffffff;">
      <h2 style="text-align: center; color: ${ok ? '#16a34a' : '#dc2626'}; margin-top: 0;">
        ${ok ? '✅ Payment Verified' : '❌ Payment Rejected'}
      </h2>
      <p style="color:#333;">
        Your payment of <strong>PHP ${Number(amount).toFixed(2)}</strong>
        (Ref: <span style="font-family:monospace;">${reference}</span>)
        has been <strong>${ok ? 'verified and confirmed' : 'rejected'}</strong>.
      </p>
      ${reason ? `<p style="color:#666; font-size: 13px;">Reason: ${reason}</p>` : ''}
      <p style="color:#333;">— The FitForge Team</p>
    </div>
  `;
  return sendViaGmailApi({
    to,
    subject: `FitForge — Payment ${ok ? 'verified' : 'rejected'} (${reference})`,
    html,
  });
}

/* ---------- COACH PAYMENT RECEIPT + QR ---------- */

async function sendCoachPaymentEmail({
  to, memberName, coachName, reference, amount, rate, hours,
  method, sessionDate, notes, qrDataUrl,
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 24px; background:#ffffff;">
      <h2 style="text-align: center; color: #2563eb; margin-top: 0;">Coach Payment Receipt 🧾</h2>
      <p style="color:#333;">Hi ${memberName || 'there'},</p>
      <p style="color:#333;">
        Your payment to coach <b>${coachName}</b> is ${method === 'cash' ? 'confirmed' : 'being processed'}.
      </p>
      ${qrDataUrl ? `
        <div style="text-align: center; margin: 20px 0;">
          <img src="${qrDataUrl}" alt="Payment QR" style="width: 200px; height: 200px; border-radius: 8px;" />
          <p style="font-size: 11px; color:#888;">Scan this for your payment reference</p>
        </div>
      ` : ''}
      <table style="width: 100%; font-size: 14px; color: #333; border-collapse: collapse;">
        <tr><td style="padding: 6px 0;"><strong>Reference:</strong></td><td style="text-align:right; font-family:monospace;">${reference}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Coach:</strong></td><td style="text-align:right;">${coachName}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Rate:</strong></td><td style="text-align:right;">PHP ${Number(rate).toFixed(2)}/hr</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Hours:</strong></td><td style="text-align:right;">${hours}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Method:</strong></td><td style="text-align:right; text-transform: uppercase;">${method}</td></tr>
        ${sessionDate ? `<tr><td style="padding: 6px 0;"><strong>Session date:</strong></td><td style="text-align:right;">${sessionDate}</td></tr>` : ''}
        ${notes ? `<tr><td style="padding: 6px 0;"><strong>Notes:</strong></td><td style="text-align:right;">${notes}</td></tr>` : ''}
      </table>
      <hr style="border:none; border-top:1px dashed #ccc; margin: 20px 0;" />
      <div style="display:flex; justify-content:space-between; font-size:18px; font-weight:bold; color:#16a34a; text-align:right;">
        Total: PHP ${Number(amount).toFixed(2)}
      </div>
      <p style="font-size: 12px; color: #888; text-align: center; margin-top: 24px;">
        — The FitForge Team
      </p>
    </div>
  `;
  return sendViaGmailApi({
    to,
    subject: `Coach payment receipt (${reference})`,
    html,
  });
}

/* ---------- ACCOUNT DELETION NOTICE ---------- */

async function sendAccountDeletionNoticeEmail({
  to, fullName, reason, deletionDate, revokeUrl,
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 24px; background:#ffffff;">
      <h2 style="text-align: center; color: #dc2626; margin-top: 0;">⚠️ Account Scheduled for Deletion</h2>
      <p style="color:#333;">Hi ${fullName || 'there'},</p>
      <p style="color:#333;">
        An administrator has scheduled your FitForge account for deletion.
      </p>
      ${reason ? `<p style="color:#666; font-size: 13px; background:#f3f4f6; padding: 10px; border-radius: 6px;"><b>Reason:</b> ${reason}</p>` : ''}
      <p style="color:#333;">
        Your account will be <b>permanently deleted on ${deletionDate}</b>. All your data — workouts, routines, memberships, and payment history — will be lost.
      </p>
      <p style="color:#333; font-weight:600;">
        Changed your mind? Click below to keep your account:
      </p>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${revokeUrl}" style="display:inline-block; padding: 14px 28px; background:#16a34a; color:#fff; border-radius:6px; text-decoration:none; font-weight:600;">
          ✓ Keep My Account
        </a>
      </p>
      <p style="font-size: 12px; color:#888; text-align: center;">
        If you don't take action before the deadline, your account will be permanently removed.
      </p>
      <p style="font-size: 11px; color: #888; text-align: center;">
        Revoke link:<br/>
        <span style="word-break: break-all;">${revokeUrl}</span>
      </p>
      <p style="font-size: 12px; color: #888; text-align: center; margin-top: 24px;">
        — The FitForge Team
      </p>
    </div>
  `;
  return sendViaGmailApi({ to, subject: '⚠️ Your FitForge account is scheduled for deletion', html });
}

/* ---------- PAYMENT RECEIPT ---------- */

async function sendPaymentReceiptEmail({
  to, userName, reference, amount, method, purpose, date, itemName,
}) {
  const formattedAmount = Number(amount).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
  });

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: #1e1e24; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0;">FitForge</h1>
        <p style="margin: 5px 0 0; color: #aaa;">Payment Receipt</p>
      </div>
      
      <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
        <p style="font-size: 16px;">Hi <strong>${userName || 'Valued Member'}</strong>,</p>
        <p>Thank you for your payment! Here is your receipt:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Reference No.</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${reference}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Date</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Purpose</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; text-transform: capitalize;">${purpose}${itemName ? ` - ${itemName}` : ''}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Payment Method</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; text-transform: uppercase;">${method}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Status</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: green; font-weight: bold;">PAID</td>
          </tr>
          <tr>
            <td style="padding: 15px 10px; font-size: 18px; font-weight: bold;">Total Amount</td>
            <td style="padding: 15px 10px; font-size: 18px; font-weight: bold; text-align: right; color: #2563eb;">${formattedAmount}</td>
          </tr>
        </table>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions about this transaction, please contact our support team.
        </p>
        <p style="color: #666; font-size: 14px;">
          Thank you for choosing FitForge! 💪
        </p>
      </div>
      
      <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
        This is an automated message from FitForge. Please do not reply to this email.
      </p>
    </div>
  `;

  return sendViaGmailApi({
    to,
    subject: `FitForge — Payment Receipt (${reference})`,
    html,
  });
}

module.exports = {
  parseEmails,
  sendWelcomeVerificationEmail,
  sendPaymentVerificationEmail,
  sendPaymentResultEmail,
  sendCoachPaymentEmail,
  sendAccountDeletionNoticeEmail,
  sendPaymentReceiptEmail,
};
