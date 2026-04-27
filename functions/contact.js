// functions/contact.js
// Netlify serverless function — handles all form submissions
// Powered by Resend (resend.com)
//
// SETUP:
// 1. Create account at resend.com
// 2. Add domain: bookdecoded.com → verify DNS
// 3. Generate API key → add to Netlify env vars as RESEND_API_KEY
// 4. Set TO_EMAIL env var → hello@bookdecoded.com
// 5. Uncomment this function in netlify.toml [functions] block
// 6. Update form submits in HTML to POST to /.netlify/functions/contact

exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { type, name, email, subject, message } = body;

  if (!email || !email.includes('@')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email' }) };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const TO_EMAIL = process.env.TO_EMAIL || 'hello@bookdecoded.com';

  // ── ROUTE BY FORM TYPE ──
  let emailPayload;

  if (type === 'contact') {
    // Contact modal — notify you + confirm to user
    emailPayload = {
      from: 'BookDecoded <hello@bookdecoded.com>',
      to: [TO_EMAIL],
      reply_to: email,
      subject: `[BookDecoded] ${subject} — ${name}`,
      html: `
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    };
  } else if (type === 'gate') {
    // Email gate unlock — add to list, send confirmation
    emailPayload = {
      from: 'BookDecoded <hello@bookdecoded.com>',
      to: [email],
      subject: 'Days 16–30 Unlocked · TROJAN Study Guide',
      html: `
        <p>You're in. Days 16–30 of the TROJAN 30-Day Study Guide are now unlocked.</p>
        <p>Continue reading at: <a href="https://trojan.bookdecoded.com">trojan.bookdecoded.com</a></p>
        <p>We'll notify you when the next guide launches.</p>
        <p>— BookDecoded</p>
      `
    };
  } else if (type === 'notify') {
    // New guide notification signup
    emailPayload = {
      from: 'BookDecoded <hello@bookdecoded.com>',
      to: [email],
      subject: "You're on the list · BookDecoded",
      html: `
        <p>Got it. You'll be the first to know when the next guide drops.</p>
        <p>Up next: The 48 Laws of Power, Influence by Cialdini, and Atomic Habits.</p>
        <p>— BookDecoded · <a href="https://bookdecoded.com">bookdecoded.com</a></p>
      `
    };
  } else {
    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown form type' }) };
  }

  // ── SEND VIA RESEND ──
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Resend error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Email send failed' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
