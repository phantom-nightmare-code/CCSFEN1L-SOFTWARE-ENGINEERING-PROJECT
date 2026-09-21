const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

/* ---------- senders ---------- */

async function sendPaymentVerificationEmail({
  to,
  additionalTo = [],
  qrDataUrl,
  reference,
  amount,
  method,
  purpose,
  itemName,
}) {
  const primary = parseEmails(to);
  const extras = parseEmails(additionalTo);
  const recipients = [...new Set([...primary, ...extras])];

  if (!recipients.length)
    throw new Error('No valid recipient email addresses');

  const adminCc = (process.env.EMAIL_CC_ADMIN || '').trim();
  const verifyUrl = `${process.env.CLIENT_URL}/verify-payment/${reference}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 24px; background:#ffffff;">
      <h2 style="text-align: center; color: #2563eb; margin-top: 0;">FitForge Payment Verification</h2>
      <p style="color:#333;">Hi,</p>
      <p style="color:#333;">
        Your payment is pending confirmation. Scan the QR code below
        (or click the button) to view the payment details and confirm.
      </p>

      <div style="text-align: center; margin: 20px 0;">
        <img src="${qrDataUrl}" alt="Payment QR Code" style="width: 220px; height: 220px; border-radius: 8px;" />
      </div>

      <table style="width: 100%; font-size: 14px; color: #333; border-collapse: collapse;">
        <tr><td style="padding: 6px 0;"><strong>Reference:</strong></td><td style="text-align:right;">${reference}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Amount:</strong></td><td style="text-align:right;">₱${Number(amount).toFixed(2)}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Method:</strong></td><td style="text-align:right; text-transform: uppercase;">${method}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Purpose:</strong></td><td style="text-align:right; text-transform: capitalize;">${purpose}</td></tr>
        ${itemName ? `<tr><td style="padding: 6px 0;"><strong>Item:</strong></td><td style="text-align:right;">${itemName}</td></tr>` : ''}
      </table>

      <p style="margin-top: 24px; color:#333;">
        After sending the payment, please tap the button below so we can verify it.
      </p>

      <p style="text-align: center; margin: 24px 0;">
        <a href="${verifyUrl}"
           style="display:inline-block; padding: 12px 24px; background:#2563eb; color:#fff; border-radius:6px; text-decoration:none; font-weight:600;">
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

  const opts = {
    from: `"FitForge" <${process.env.EMAIL_USER}>`,
    replyTo: process.env.EMAIL_USER,
    to: recipients,           // array — all as direct To
    subject: `FitForge — Verify your payment (${reference})`,
    html,
  };

  if (adminCc && EMAIL_RE.test(adminCc) && !recipients.includes(adminCc.toLowerCase())) {
    opts.cc = adminCc;
  }

  console.log('[mailer] Sending verification email:', {
    to: recipients,
    cc: opts.cc || null,
    reference,
  });

  try {
    const info = await transporter.sendMail(opts);
    console.log('[mailer] ✅ Sent:', info.messageId, '→', info.accepted);
    if (info.rejected && info.rejected.length) {
      console.warn('[mailer] ⚠️  Rejected:', info.rejected);
    }
    return info;
  } catch (err) {
    console.error('[mailer] ❌ Send failed:', err.message);
    throw err;
  }
}

async function sendPaymentResultEmail({ to, reference, amount, status, reason }) {
  const primary = parseEmails(to);
  if (!primary.length) throw new Error('No valid recipient');

  const adminCc = (process.env.EMAIL_CC_ADMIN || '').trim();
  const ok = status === 'verified';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 24px; background:#ffffff;">
      <h2 style="text-align: center; color: ${ok ? '#16a34a' : '#dc2626'}; margin-top: 0;">
        ${ok ? '✅ Payment Verified' : '❌ Payment Rejected'}
      </h2>
      <p style="color:#333;">
        Your payment of <strong>₱${Number(amount).toFixed(2)}</strong>
        (Ref: <span style="font-family:monospace;">${reference}</span>)
        has been <strong>${ok ? 'verified and confirmed' : 'rejected'}</strong>.
      </p>
      ${reason ? `<p style="color:#666; font-size: 13px;">Reason: ${reason}</p>` : ''}
      <p style="color:#333;">— The FitForge Team</p>
    </div>
  `;

  const opts = {
    from: `"FitForge" <${process.env.EMAIL_USER}>`,
    replyTo: process.env.EMAIL_USER,
    to: primary,
    subject: `FitForge — Payment ${ok ? 'verified' : 'rejected'} (${reference})`,
    html,
  };

  if (adminCc && EMAIL_RE.test(adminCc) && !primary.includes(adminCc.toLowerCase())) {
    opts.cc = adminCc;
  }

  return transporter.sendMail(opts);
}

module.exports = {
  parseEmails,
  sendPaymentVerificationEmail,
  sendPaymentResultEmail,
};