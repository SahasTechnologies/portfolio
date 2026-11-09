import type { APIRoute } from 'astro';

// Contact form endpoint. The address it delivers to never appears in the page
// HTML — the server sends the message through the email API instead.
export const prerender = false;

const LIMIT = { name: 80, email: 160, message: 4000 };
const RATE = { windowMs: 60 * 60 * 1000, max: 5 };
const hits = new Map<string, number[]>();

function tooMany(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE.windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE.max;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO ?? 'sahas@shimpi.dev';
  const from = process.env.CONTACT_FROM ?? 'Portfolio <contact@shimpi.dev>';

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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'That email address looks off.' }, 400);
  }
  if (tooMany(clientAddress ?? 'unknown')) {
    return json({ ok: false, error: 'Too many messages just now — try again later.' }, 429);
  }
  if (!apiKey) {
    return json({ ok: false, error: 'not_configured' }, 503);
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `Portfolio message from ${name}`,
      text: `${message}\n\n— ${name} <${email}>`,
    }),
  });

  if (!res.ok) {
    console.error('contact: email API rejected the message', res.status, await res.text());
    return json({ ok: false, error: 'The mail service refused it — try again later.' }, 502);
  }

  return json({ ok: true });
};
