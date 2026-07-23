#!/usr/bin/env node
/**
 * SMTP connectivity + delivery test for TRAQQ.
 *
 * Usage (run from /root/traqq/backend on the VPS):
 *   node scripts/test-email.js                         # sends to EMAIL_USER
 *   node scripts/test-email.js you@example.com         # sends to specified address
 *
 * Reads EMAIL_* vars from the process environment (loaded by PM2 / .env at startup).
 * To force-load .env manually: node -r dotenv/config scripts/test-email.js
 */

'use strict';

const nodemailer = require('nodemailer');

const recipient = process.argv[2] || process.env.EMAIL_USER;

// ── Preflight ────────────────────────────────────────────────────────────────

const required = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('\n❌  Missing required env vars:', missing.join(', '));
  console.error('   Set them in backend/.env and restart, or export them before running.\n');
  process.exit(1);
}

if (!recipient) {
  console.error('\n❌  No recipient — pass an email address as the first argument.\n');
  process.exit(1);
}

// ── Transport ────────────────────────────────────────────────────────────────

const transport = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '465', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const fromAddr = process.env.EMAIL_FROM || `"TRAQQ Airport Shuttle" <${process.env.EMAIL_USER}>`;

// ── Run ──────────────────────────────────────────────────────────────────────

console.log('\nTRAQQ SMTP Test');
console.log('───────────────────────────────────────');
console.log(`Host:      ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}  (secure=${process.env.EMAIL_SECURE})`);
console.log(`Auth user: ${process.env.EMAIL_USER}`);
console.log(`From:      ${fromAddr}`);
console.log(`To:        ${recipient}`);
console.log('───────────────────────────────────────\n');

async function run() {
  // Step 1 — verify SMTP connection
  process.stdout.write('[1/2] Verifying SMTP connection ... ');
  await transport.verify();
  console.log('OK ✅');

  // Step 2 — send test email
  process.stdout.write('[2/2] Sending test email          ... ');
  const sentAt = new Date().toISOString();
  const info = await transport.sendMail({
    from: fromAddr,
    to: recipient,
    subject: 'TRAQQ – SMTP Test Successful',
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>TRAQQ SMTP Test</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
               style="max-width:520px;margin:0 auto;background-color:#111111;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px;text-align:center;background-color:#111111;border-bottom:1px solid #222;">
              <h1 style="margin:0;font-size:26px;font-weight:900;letter-spacing:4px;color:#c9a84c;">TRAQQ</h1>
              <p style="margin:6px 0 0;font-size:11px;color:#888;letter-spacing:2px;text-transform:uppercase;">Premium Airport Shuttle</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;background-color:#1a1a1a;">
              <div style="text-align:center;padding:20px;background-color:#1a2e1a;border-radius:8px;border:1px solid #2d4a2d;margin:0 0 28px;">
                <p style="margin:0;color:#4ade80;font-size:18px;font-weight:bold;">SMTP Working ✅</p>
              </div>
              <p style="margin:0 0 16px;color:#aaaaaa;font-size:14px;line-height:1.7;">
                If you received this, your production email configuration is working correctly.
                Booking confirmations, QR code delivery, trip reminders, and admin notifications
                are all ready to send.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                     style="border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;margin:0 0 8px;">
                <tr>
                  <td style="padding:10px 16px;color:#888;font-size:12px;width:38%;border-bottom:1px solid #2a2a2a;">Host</td>
                  <td style="padding:10px 16px;color:#fff;font-size:12px;border-bottom:1px solid #2a2a2a;">${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#888;font-size:12px;width:38%;border-bottom:1px solid #2a2a2a;">Sender</td>
                  <td style="padding:10px 16px;color:#fff;font-size:12px;border-bottom:1px solid #2a2a2a;">${process.env.EMAIL_USER}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#888;font-size:12px;width:38%;">Sent at</td>
                  <td style="padding:10px 16px;color:#fff;font-size:12px;">${sentAt}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;text-align:center;background-color:#111111;border-top:1px solid #222;">
              <p style="margin:0;font-size:12px;color:#555;">© ${new Date().getFullYear()} TRAQQ Premium Airport Shuttle. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  });

  console.log('Sent ✅');
  console.log(`\n   Message-ID : ${info.messageId}`);
  console.log(`   Recipient  : ${recipient}`);
  console.log(`   Sent at    : ${sentAt}`);
  console.log('\n   Check the inbox to confirm delivery.\n');
}

run().catch(err => {
  console.error('\nFAILED ❌');
  console.error(`\n   Error: ${err.message}`);
  if (err.code === 'ECONNREFUSED') {
    console.error('   → Cannot reach SMTP server. Verify EMAIL_HOST / EMAIL_PORT and that port 465 is open outbound.');
  } else if (err.code === 'ESOCKET' || err.code === 'ECONNRESET') {
    console.error('   → Connection dropped. If using port 465, ensure EMAIL_SECURE=true. Try port 587 + EMAIL_SECURE=false as a fallback.');
  } else if (err.responseCode === 535 || err.code === 'EAUTH') {
    console.error('   → Authentication failed. Double-check EMAIL_USER and EMAIL_PASS.');
  } else if (err.responseCode === 550) {
    console.error('   → Sending address rejected. Verify EMAIL_USER is an authorised mailbox on this server.');
  }
  console.error('');
  process.exit(1);
});
