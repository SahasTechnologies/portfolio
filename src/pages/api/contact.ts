import type { APIRoute } from 'astro';
import { EMAIL_RE, json, limiter, mailFrom, sendMail } from '../../lib/mail';
import { verifyTurnstile } from '../../lib/turnstile';

// Contact form endpoint. The address it delivers to never appears in the page
// HTML — the server sends the message through the mail API instead.
export const prerender = false;

const LIMIT = { name: 80, email: 160, message: 4000 };
const tooMany = limiter(5);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const to = process.env.CONTACT_TO ?? 'sahas@shimpi.dev';
  const from = mailFrom('Portfolio <contact@shimpi.dev>');

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'Bad request.' }, 400);
  }

  const name = String(payload.name ?? '').trim();
  const email = String(payload.email ?? '').trim();
  const message = String(payload.message ?? '').trim();
  const honeypot = String(payload.website ?? '').trim();

  // Bots fill the hidden field; pretend it worked and drop it.
  if (honeypot) return json({ ok: true });

  if (!name || !email || !message) {
    return json({ ok: false, error: 'Name, email and message are all needed.' }, 400);
  }
  if (name.length > LIMIT.name || email.length > LIMIT.email || message.length > LIMIT.message) {
    return json({ ok: false, error: 'That is longer than the form allows.' }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'That email address looks off.' }, 400);
  }
  if (tooMany(clientAddress ?? 'unknown')) {
    return json({ ok: false, error: 'Too many messages just now — try again later.' }, 429);
  }

  // The widget token is redeemed once, right before the message is sent, so an
  // invalid field never burns it.
  const human = await verifyTurnstile(payload['cf-turnstile-response'], 'contact', clientAddress);
  if (!human.ok) return json({ ok: false, error: human.error }, human.status);

  const result = await sendMail({
    from,
    to,
    replyTo: email,
    subject: `Portfolio message from ${name}`,
    text: `${message}\n\n— ${name} <${email}>`,
    tag: 'portfolio-contact',
  });

  return result.ok ? json({ ok: true }) : json({ ok: false, error: result.error }, result.status);
};
