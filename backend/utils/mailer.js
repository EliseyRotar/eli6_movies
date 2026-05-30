const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM     = process.env.MAIL_FROM || 'ELI6 Movies <onboarding@resend.dev>';
const APP_URL       = (process.env.APP_URL || 'https://eli6movies.vercel.app').replace(/\/+$/, '');

async function sendEmail({ to, subject, html }) {
    if (!RESEND_API_KEY) {
        // eslint-disable-next-line no-console
        console.warn('[mailer] RESEND_API_KEY not set — email skipped');
        return null;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const r = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify({ from: MAIL_FROM, to, subject, html }),
        signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!r.ok) {
        const body = await r.text().catch(() => '');
        throw new Error(`Resend error ${r.status}: ${body}`);
    }
    return r.json();
}

function passwordResetEmail(username, resetUrl) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0d0d0f;font-family:system-ui,sans-serif;color:#e8e8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#16161a;border:1px solid #2a2a35;border-radius:12px;padding:40px">
        <tr><td>
          <div style="font-size:24px;font-weight:800;color:#fff;margin-bottom:8px">ELI6<span style="color:#6c5ce7">.</span></div>
          <h1 style="font-size:20px;font-weight:700;margin:0 0 16px">Reset your password</h1>
          <p style="color:#7c7c99;margin:0 0 24px">Hi ${escHtml(username)}, we received a request to reset your password. Click the button below. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#6c5ce7;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">Reset password</a>
          <p style="color:#7c7c99;font-size:12px;margin:24px 0 0">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
          <p style="color:#3a3a45;font-size:11px;margin:8px 0 0">Or copy this link: ${resetUrl}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function verifyEmailTemplate(username, verifyUrl) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0d0d0f;font-family:system-ui,sans-serif;color:#e8e8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#16161a;border:1px solid #2a2a35;border-radius:12px;padding:40px">
        <tr><td>
          <div style="font-size:24px;font-weight:800;color:#fff;margin-bottom:8px">ELI6<span style="color:#6c5ce7">.</span></div>
          <h1 style="font-size:20px;font-weight:700;margin:0 0 16px">Verify your email</h1>
          <p style="color:#7c7c99;margin:0 0 24px">Hi ${escHtml(username)}, thanks for joining! Click the button below to verify your email address.</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#6c5ce7;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">Verify email</a>
          <p style="color:#3a3a45;font-size:11px;margin:24px 0 0">Or copy this link: ${verifyUrl}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { sendEmail, passwordResetEmail, verifyEmailTemplate, APP_URL };
