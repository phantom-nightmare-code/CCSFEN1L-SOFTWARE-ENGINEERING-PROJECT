// Brevo HTTPS API — works on Render where SMTP is blocked
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

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

function parseFrom(fromStr) {
  // Accepts: 'Name <email@example.com>' or 'email@example.com'
  if (!fromStr) return { name: 'FitForge', email: process.env.EMAIL_USER };
  const match = fromStr.match(/^(.*)<(.+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2].trim() };
  }
  return { name: 'FitForge', email: fromStr.trim() };
}

async function sendViaBrevo({ to, subject, html, cc }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not set');

  const sender = parseFrom(process.env.EMAIL_FROM);
  const recipients = parseEmails(to).map(email => ({ email }));
  if (!recipients.length) throw new Error('No valid recipients');

  const body = {
    sender,
    to: recipients,
    subject,
    htmlContent: html,
  };

  if (cc && cc.length) {
    body.cc = cc.map(email => ({ email }));
  }

  console.log('[mailer] POST → Brevo API', { to: recipients.map(r => r.email), subject });

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.message || data.error || `HTTP ${res.status}`;
    console.error('[mailer] ❌ Brevo API error:', msg, data);
    throw new Error(msg);
  }

  console.log('[mailer] ✅ Brevo accepted:', data.messageId || '(no id)');
  return data;
}

/* ---------- WELCOME / VERIFICATION EMAIL ---------- */

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

  return sendViaBrevo({
    to,
    subject: 'Verify your FitForge account 💪',
    html,
  });
}

/* ---------- PAYMENT VERIFICATION EMAIL ---------- */

async function sendPaymentVerificationEmail({
  to, additionalTo = [], qrDataUrl, reference,
  amount, method, purpose, itemName,
}) {
  const adminCc = (process.env.EMAIL_CC_ADMIN || '').trim();
  const verifyUrl = `${process.env.CLIENT_URL}/verify-payment/${reference}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 24px; background:#ffffff;">
      <h2 style="text-align: center; color: #2563eb; margin-top: 0;">FitForge Payment Verification</h2>
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

  const cc = adminCc && EMAIL_RE.test(adminCc) && !uniqueRecipients.includes(adminCc.toLowerCase())
    ? [adminCc]
    : [];

  return sendViaBrevo({
    to: uniqueRecipients,
    subject: `FitForge — Verify your payment (${reference})`,
    html,
    cc,
  });
}

async function sendPaymentResultEmail({ to, reference, amount, status, reason }) {
  const adminCc = (process.env.EMAIL_CC_ADMIN || '').trim();
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

  const primary = parseEmails(to);
  const cc = adminCc && EMAIL_RE.test(adminCc) && !primary.includes(adminCc.toLowerCase())
    ? [adminCc]
    : [];

  return sendViaBrevo({
    to: primary,
    subject: `FitForge — Payment ${ok ? 'verified' : 'rejected'} (${reference})`,
    html,
    cc,
  });
}

module.exports = {
  parseEmails,
  sendWelcomeVerificationEmail,
  sendPaymentVerificationEmail,
  sendPaymentResultEmail,
};
