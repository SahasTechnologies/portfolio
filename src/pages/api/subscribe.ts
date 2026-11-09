import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { EMAIL_RE, json, limiter, mailFrom, sendMail, siteOrigin } from '../../lib/mail';
import { beginVerification } from '../../lib/store';

// Newsletter signup: store the address as pending and mail a confirmation link,
// so nobody can put someone else on the list. Nothing counts as subscribed until
// that link is opened.
export const prerender = false;

const tooMany = limiter(5);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'Bad request.' }, 400);
  }

  // Bots fill the hidden field; answer like it worked and drop it.
  if (String(payload.website ?? '').trim()) return json({ ok: true });

  const email = String(payload.email ?? '').trim().toLowerCase();
  if (!email) return json({ ok: false, error: 'An email address is needed.' }, 400);
  if (email.length > 160 || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'That email address looks off.' }, 400);
  }
  if (tooMany(clientAddress ?? 'unknown')) {
    return json({ ok: false, error: 'Too many signups just now — try again later.' }, 429);
  }

  const token = randomBytes(24).toString('hex');

  // An address already on the list gets the same answer, so the form never
  // reveals who is subscribed.
  if (beginVerification(email, token) === 'already') return json({ ok: true });

  const origin = siteOrigin(request);
  const confirmUrl = `${origin}/api/confirm?token=${token}`;
  const unsubscribeUrl = `${origin}/api/unsubscribe?token=${token}`;

  const result = await sendMail({
    from: mailFrom('Portfolio <contact@shimpi.dev>'),
    to: email,
    subject: 'Confirm your subscription',
    text: [
      'Someone — hopefully you — asked to be on the list at shimpi.dev.',
      '',
      `Confirm here: ${confirmUrl}`,
      '',
      'Nothing is stored until you confirm. If this was not you, ignore this mail.',
      `Unsubscribe: ${unsubscribeUrl}`,
    ].join('\n'),
    html: [
      '<p>Someone — hopefully you — asked to be on the list at shimpi.dev.</p>',
      `<p><a href="${confirmUrl}">Confirm your subscription</a></p>`,
      '<p>Nothing is stored until you confirm. If this was not you, ignore this mail.</p>',
      `<p><a href="${unsubscribeUrl}">Unsubscribe</a></p>`,
    ].join('\n'),
    tag: 'newsletter-confirm',
  });

  return result.ok ? json({ ok: true }) : json({ ok: false, error: result.error }, result.status);
};
