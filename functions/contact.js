// functions/contact.js
// Handles: contact modal, email gate unlock, new guide notifications
// Uses Resend API — key stored in Netlify environment variables (never in repo)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { type, name, email, subject, message } = body;

  if (!email || !email.includes('@')) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid email required' }) };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const TO_EMAIL       = process.env.TO_EMAIL || 'hello@bookdecoded.com';
  const FROM           = 'BookDecoded <hello@bookdecoded.com>';

  if (!RESEND_API_KEY) {
    console.error('[contact] RESEND_API_KEY not configured');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

  const send = async (payload) => {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(await r.text());
  };

  // Add contact to Resend audience (silent fail — never block email send)
  const addContact = async (contactEmail, firstName = '') => {
    if (!AUDIENCE_ID) return;
    try {
      await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: contactEmail, first_name: firstName, unsubscribed: false }),
      });
    } catch (err) {
      console.error('[contact] addContact failed:', err.message);
    }
  };

  const wrap = (inner) => `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#0e0d0a;">
      <div style="background:#080806;padding:20px 28px;border-bottom:2px solid #b8962a;">
        <p style="font-family:monospace;font-size:10px;letter-spacing:0.2em;color:#b8962a;margin:0;">BOOKDECODED</p>
      </div>
      <div style="padding:28px;">${inner}</div>
      <div style="padding:16px 28px;border-top:1px solid #e2ddd6;">
        <p style="font-size:12px;color:#a8a29a;margin:0;">BookDecoded · <a href="https://bookdecoded.com" style="color:#a8a29a;">bookdecoded.com</a></p>
      </div>
    </div>`;

  try {
    if (type === 'contact') {
      await send({ from: FROM, to: [TO_EMAIL], reply_to: email,
        subject: `[Contact] ${subject} — ${name}`,
        html: wrap(`<p><strong>${name}</strong> (${email}) wrote:</p><p><strong>${subject}</strong></p><hr style="border:none;border-top:1px solid #e2ddd6;margin:16px 0;"><p style="white-space:pre-wrap;">${message}</p>`) });
      await send({ from: FROM, to: [email],
        subject: 'Message received · BookDecoded',
        html: wrap(`<p>Hi ${name || 'there'},</p><p>Your message has been received. We'll reply within 48 hours.</p><p style="margin-top:20px;"><a href="https://trojan.bookdecoded.com" style="color:#b8962a;">Continue with the guide →</a></p>`) });

    } else if (type === 'gate') {
      await addContact(email);
      await send({ from: FROM, to: [email],
        subject: 'Days 16–30 Unlocked · TROJAN Study Guide',
        html: wrap(`<p>You're in. Days 16–30 are now unlocked.</p>
          <p style="margin:24px 0;"><a href="https://trojan.bookdecoded.com/?unlocked=1#day16" style="background:#080806;color:#fff;padding:12px 24px;text-decoration:none;font-family:monospace;font-size:11px;letter-spacing:0.15em;display:inline-block;">CONTINUE READING →</a></p>
          <div style="background:#f0ebe2;border-left:3px solid #b8962a;padding:16px 20px;margin:24px 0;border-radius:0 3px 3px 0;">
            <p style="margin:0 0 8px;font-size:13px;color:#0e0d0a;"><strong>Two quick things:</strong></p>
            <p style="margin:0 0 8px;font-size:13px;color:#6b665e;">1. This email may have landed in your spam folder. If it did, please mark it <strong>Not Spam</strong> and add <a href="mailto:hello@bookdecoded.com" style="color:#b8962a;">hello@bookdecoded.com</a> to your contacts — so you don't miss the next guide launch.</p>
            <p style="margin:0;font-size:13px;color:#6b665e;">2. The 48 Laws of Power guide is coming next. You'll be the first to know when it drops.</p>
          </div>`) });
      await send({ from: FROM, to: [TO_EMAIL],
        subject: `[Gate Unlock] ${email}`,
        html: `<p>New unlock: <strong>${email}</strong></p>` });

    } else if (type === 'notify') {
      await addContact(email);
      await send({ from: FROM, to: [email],
        subject: "You're on the list · BookDecoded",
        html: wrap(`<p>You'll be the first to know when the next guide drops.</p>
          <p style="margin-top:16px;">Up next: <strong>The 48 Laws of Power</strong>, <strong>Influence</strong>, <strong>Atomic Habits</strong>.</p>
          <p style="margin-top:20px;"><a href="https://trojan.bookdecoded.com" style="color:#b8962a;">Start the TROJAN guide now →</a></p>`) });
      await send({ from: FROM, to: [TO_EMAIL],
        subject: `[Notify Signup] ${email}`,
        html: `<p>New signup: <strong>${email}</strong></p>` });

    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown type' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error('[contact] Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Send failed' }) };
  }
};
